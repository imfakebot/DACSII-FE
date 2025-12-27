import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

export type GenderType = 'male' | 'female' | 'other';
export type AccountStatus = 'active' | 'inactive' | 'banned' | 'suspended' | 'deleted';
export type AuthProviderType = 'local' | 'credentials' | 'google' | 'facebook';

export interface RoleDto {
  id: number;
  name: string;
  description?: string | null;
}

export interface UserProfileDto {
  id: string;
  full_name: string;
  phone_number: string;
  gender?: GenderType | null;
  bio?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  is_profile_complete: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AccountMeResponse {
  id: string;
  email: string;
  provider: AuthProviderType;
  status: AccountStatus;
  is_verified: boolean;
  last_login?: string | null;
  two_factor_enabled?: boolean;
  userProfile?: UserProfileDto | null;
  role?: RoleDto | null;
}

export interface UpdateUserProfileDto {
  full_name?: string;
  phone_number?: string;
  gender?: GenderType;
  bio?: string;
  date_of_birth?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService) {}

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private getStoredToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }
    return localStorage.getItem('accessToken');
  }

  hasAccessToken(): boolean {
    return !!this.getStoredToken();
  }

  private requireAuthHeaders(): { headers: HttpHeaders } {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  async getMe(): Promise<AccountMeResponse | null> {
    try {
      // Use full response so we can detect an empty body (200 with no content)
      const url = `${this.baseUrl.getApiBaseUrl()}/users/me`;
      const httpResp: any = await firstValueFrom(
        this.http.get(url, { ...(this.requireAuthHeaders()), observe: 'response' } as any)
      );
      const body = httpResp?.body ?? null;
      if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
        console.warn('[UsersApiService] /users/me returned empty body', { status: httpResp?.status, body });
        return null;
      }
      return body as AccountMeResponse;
    } catch (err: any) {
      // Re-throw so callers can inspect status, but log for easier debugging
      console.warn('[UsersApiService] getMe failed', err);
      throw err;
    }
  }

  async updateMyProfile(payload: UpdateUserProfileDto): Promise<{ message: string }> {
    const url = `${this.baseUrl.getApiBaseUrl()}/users/me/profile`;
    return firstValueFrom(
      this.http.put<{ message: string }>(url, payload, this.requireAuthHeaders())
    );
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const payload = { oldPassword, newPassword };
    const url = `${this.baseUrl.getApiBaseUrl()}/users/me/password`;
    return firstValueFrom(
      this.http.patch<{ message: string }>(url, payload, this.requireAuthHeaders())
    );
  }

  async uploadAvatar(file: File): Promise<UserProfileDto> {
    const formData = new FormData();
    formData.append('avatar', file);
    const url = `${this.baseUrl.getApiBaseUrl()}/users/me/avatar`;
    return firstValueFrom(
      this.http.patch<UserProfileDto>(url, formData, this.requireAuthHeaders())
    );
  }
}
