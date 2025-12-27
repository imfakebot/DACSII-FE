import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';
import { AuthStateService } from './auth-state.service';
import { MeStateService } from './me-state.service';

interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  gender?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private http: HttpClient,
    private baseUrl: BaseUrlService,
    private authState: AuthStateService,
    private meState: MeStateService,
  ) {}

  async register(data: RegisterPayload): Promise<{ message: string }> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/register/initiate`;
    return firstValueFrom(this.http.post<{ message: string }>(url, data));
  }

  async completeRegistration(email: string, verificationCode: string): Promise<{ message: string }> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/register/complete`;
    return firstValueFrom(this.http.post<{ message: string }>(url, { email, verificationCode }));
  }

  // Login two-step: initiate sends OTP to email, complete verifies OTP and returns tokens
  async loginInitiate(email: string, password: string): Promise<any> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/login/initiate`;
    return firstValueFrom(this.http.post<any>(url, { email, password }));
  }

  async loginComplete(email: string, verificationCode: string): Promise<any> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/login/complete`;
    const res = await firstValueFrom(this.http.post<any>(url, { email, verificationCode }));
    // Lưu token nếu trả về
    if (res?.accessToken) localStorage.setItem('accessToken', res.accessToken);
    if (res?.refreshToken) localStorage.setItem('refreshToken', res.refreshToken);
    // Sau đó gọi /users/me để đồng bộ thông tin người dùng
    try {
      const me = await this.meState.load(true);
      if (!me) {
        throw new Error('Không thể tải thông tin tài khoản.');
      }
    } catch {
      // Fallback chỉ lưu thông tin có sẵn từ login response
      const fallbackUser = {
        id: res?.user?.id || '',
        email: res?.user?.email,
        full_name: res?.user?.full_name,
        role: res?.user?.role,
      };
      this.authState.setUser(fallbackUser);
    }
    return res;
  }

  async refreshTokens(): Promise<{ accessToken: string }> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/refresh`;
    // Refresh uses httpOnly cookie; must send with credentials
    const result = await firstValueFrom(this.http.post<{ accessToken: string }>(url, {}, { withCredentials: true }));
    if (result?.accessToken) {
      try { localStorage.setItem('accessToken', result.accessToken); } catch { /* ignore */ }
    }
    return result;
  }

  async logout(): Promise<void> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/logout`;
    try {
      const token = localStorage.getItem('accessToken');
      await firstValueFrom(this.http.post(url, {}, { headers: token ? { Authorization: `Bearer ${token}` } : undefined, withCredentials: true }));
    } catch {
      // ignore network/server errors on logout; still clear client state
    } finally {
      this.authState.setUser(null);
      this.meState.clear();
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/forgot-password`;
    return firstValueFrom(this.http.post<{ message: string }>(url, { email }));
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/reset-password`;
    return firstValueFrom(this.http.post<{ message: string }>(url, { token, newPassword }));
  }

  async loginWithGoogle(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Đăng nhập Google chỉ khả dụng trên trình duyệt.');
    }

    // Request account chooser from Google so user can pick an account.
    // Use 'select_account' to force the account chooser.
    // Backend will receive these params and pass them to Google OAuth.
    const oauthParams = new URLSearchParams({
      prompt: 'select_account',
      access_type: 'offline',
      include_granted_scopes: 'true',
    }).toString();
    
    // Construct auth URL properly
    const baseAuthUrl = this.baseUrl.getAuthBaseUrl();
    const authUrl = `${baseAuthUrl}/google?${oauthParams}`;
    
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Open a same-origin blank popup first so window.opener is preserved across navigations
    const popup = window.open(
      '',
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!popup) {
      throw new Error('Vui lòng bật pop-up để tiếp tục đăng nhập với Google.');
    }

    try {
      popup.document.write('<!doctype html><html><head><title>Đang chuyển hướng...</title></head><body><p>Đang chuyển hướng tới Google...</p></body></html>');
      popup.document.close();
    } catch (e) {
      // ignore write errors in restricted environments
    }

    // We'll add the message listener first, then navigate the popup to backend auth URL.
    // This avoids a race where the backend callback posts a message before the listener is registered.

    const backendOrigin = new URL(this.baseUrl.getAuthBaseUrl()).origin;

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('Quá trình đăng nhập Google đã hết thời gian.'));
      }, 2 * 60 * 1000);

      // Add a periodic refresh-poll fallback: some environments block postMessage
      // but the backend may still set the httpOnly cookie in the popup response.
      const refreshPollInterval = 1000;
      let refreshPollId: number | null = null;
      const startRefreshPoll = () => {
        try {
          refreshPollId = window.setInterval(async () => {
            try {
              const result = await this.refreshTokens();
              if (result?.accessToken) {
                console.debug('[Google OAuth] refreshTokens poll detected login');
                try { await this.meState.load(true); } catch (_) {}
                cleanup();
                resolve();
              }
            } catch (_) {
              // ignore until timeout
            }
          }, refreshPollInterval) as unknown as number;
        } catch (_) {}
      };
      startRefreshPoll();

      // NOTE: avoid polling `popup.closed` or other cross-origin properties here.
      // Accessing those can trigger Cross-Origin-Opener-Policy warnings in modern browsers.
      // We rely on `postMessage` from the callback and a server-side cookie refresh poll
      // as fallbacks. The overall `timeoutId` will reject if neither occurs in time.

      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        window.clearTimeout(timeoutId);
        try { if (refreshPollId) { window.clearInterval(refreshPollId); refreshPollId = null; } } catch (_) {}
        try {
          // Attempt to close popup by name without reading cross-origin properties.
          const sameNamed = window.open('', 'google-oauth');
          if (sameNamed && typeof sameNamed.close === 'function') {
            sameNamed.close();
          }
        } catch (_) {}
      };

      const handleMessage = async (event: MessageEvent) => {
        console.debug('[Google OAuth] postMessage received', event.origin, event.data);
        if (event.origin !== backendOrigin) {
          console.warn('[Google OAuth] Ignoring message from unexpected origin', event.origin);
          return;
        }

        const data = event.data ?? {};
        if (data?.error) {
          cleanup();
          reject(new Error(data.error));
          return;
        }

        if (!data?.accessToken) {
          // if no token in message, rely on refresh-poll to detect login
          console.warn('[Google OAuth] postMessage contains no accessToken, will rely on refresh poll');
          return;
        }

        try {
          localStorage.setItem('accessToken', data.accessToken);
          if (data?.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }

          try {
            await this.meState.load(true);
          } catch (loadErr) {
            const fallbackUser = {
              id: data.user?.id || '',
              email: data.user?.email,
              full_name: data.user?.full_name || data.user?.email,
              role: data.user?.role,
            };
            if (fallbackUser.id && fallbackUser.email) {
              this.authState.setUser(fallbackUser);
            } else {
              throw loadErr;
            }
          }

          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Đăng nhập Google thất bại.'));
        } finally {
          cleanup();
        }
      };

      // Register listener before navigating popup to avoid race conditions
      window.addEventListener('message', handleMessage, false);

      // Navigate popup to backend auth URL (backend will redirect to Google)
      try {
        popup.location.href = authUrl;
      } catch (e) {
        // fallback if direct assignment blocked
        try { popup.location.replace(authUrl); } catch (_) { }
      }

      try { popup.focus(); } catch (_) {}
    });
  }
}
