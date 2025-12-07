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

    const authUrl = `${this.baseUrl.getAuthBaseUrl()}/google`;
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!popup) {
      throw new Error('Vui lòng bật pop-up để tiếp tục đăng nhập với Google.');
    }

    const backendOrigin = new URL(this.baseUrl.getAuthBaseUrl()).origin;

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('Quá trình đăng nhập Google đã hết thời gian.'));
      }, 2 * 60 * 1000);

      const closeWatcher = window.setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error('Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.'));
        }
      }, 500);

      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        window.clearTimeout(timeoutId);
        window.clearInterval(closeWatcher);
        if (popup && !popup.closed) {
          popup.close();
        }
      };

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== backendOrigin) {
          return;
        }

        const data = event.data ?? {};
        if (data?.error) {
          cleanup();
          reject(new Error(data.error));
          return;
        }

        if (!data?.accessToken) {
          cleanup();
          reject(new Error('Không nhận được token hợp lệ từ Google.'));
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

      window.addEventListener('message', handleMessage);
      popup.focus();
    });
  }
}
