import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';
import { AuthStateService } from './auth-state.service';

interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  gender?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService, private authState: AuthStateService) {}

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
    // Sau đó gọi /users/me để lấy full_name
    try {
      const me: any = await firstValueFrom(this.http.get<any>('http://localhost:3000/users/me'));
      // Backend trả về Account với quan hệ userProfile (nếu đã có). Lấy full_name từ userProfile.
      const fullName = me?.userProfile?.full_name || me?.full_name || res?.user?.full_name;
      this.authState.setUser({ id: me.id || me.accountId || res?.user?.id || '', email: me.email || res?.user?.email, full_name: fullName, role: me?.role?.name || me?.role || res?.user?.role });
    } catch {
      // Fallback chỉ lưu thông tin có sẵn từ login response
      const fullName = res?.user?.full_name; // nếu sau này backend thêm
      this.authState.setUser({ id: res?.user?.id || '', email: res?.user?.email, full_name: fullName, role: res?.user?.role });
    }
    return res;
  }

  logout() {
    this.authState.setUser(null);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/forgot-password`;
    return firstValueFrom(this.http.post<{ message: string }>(url, { email }));
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/reset-password`;
    return firstValueFrom(this.http.post<{ message: string }>(url, { token, newPassword }));
  }
}
