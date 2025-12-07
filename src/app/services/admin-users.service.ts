import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AccountMeResponse } from './users.service';
import { AuthService } from './auth.service';
import { BaseUrlService } from '../base_url';

export interface AdminUsersResponse {
  data: AccountMeResponse[];
  total: number;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  constructor(private http: HttpClient, private authService: AuthService, private baseUrl: BaseUrlService) {}

  private apiBase(): string {
    try {
      const authBase = this.baseUrl.getAuthBaseUrl();
      // authBase is like http://localhost:3000/auth -> return origin only
      return new URL(authBase).origin;
    } catch {
      return '';
    }
  }

  private authHeaders(): { headers: HttpHeaders } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    // Debug info to help diagnose Forbidden issues without leaking full token
    try {
      console.debug('[AdminUsersService] Token present:', !!token, token ? `${token.slice(0,8)}...${token.slice(-6)}` : null);
      if (token) {
        const payload = this.decodeJwtPayload(token);
        if (payload) {
          const now = Math.floor(Date.now() / 1000);
          const isExpired = payload.exp && payload.exp < now;
          console.debug('[AdminUsersService] JWT payload:', {
            role: payload.role,
            exp: payload.exp,
            expDate: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
            isExpired,
            sub: payload.sub
          });
          if (isExpired) {
            console.warn('[AdminUsersService] ⚠️ Token đã hết hạn!');
          }
        }
      }
    } catch (e) {
      console.error('[AdminUsersService] Debug error:', e);
    }
    if (!token) {
      throw new Error('Bạn cần đăng nhập với quyền Admin.');
    }
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  async getUsers(page = 1): Promise<AdminUsersResponse> {
    const url = `${this.apiBase()}/users/admin/all?page=${page}`;
    return this.requestWithRetry(() => firstValueFrom(
      this.http.get<AdminUsersResponse>(url, this.authHeaders())
    ));
  }

  async banUser(userId: string): Promise<{ message: string }> {
    const url = `${this.apiBase()}/users/admin/${userId}/ban`;
    return this.requestWithRetry(() => firstValueFrom(
      this.http.patch<{ message: string }>(url, {}, this.authHeaders())
    ));
  }

  async unbanUser(userId: string): Promise<{ message: string }> {
    const url = `${this.apiBase()}/users/admin/${userId}/unban`;
    return this.requestWithRetry(() => firstValueFrom(
      this.http.patch<{ message: string }>(url, {}, this.authHeaders())
    ));
  }

  // Create an employee (Admin or Manager creates staff/manager)
  async createEmployee(payload: any): Promise<any> {
    const url = `${this.apiBase()}/users/create-employee`;
    return this.requestWithRetry(() => firstValueFrom(
      this.http.post<any>(url, payload, this.authHeaders())
    ));
  }

  private async requestWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status || err?.statusCode || null;
      console.error('[AdminUsersService] Request failed:', {
        status,
        message: err?.message,
        error: err?.error,
        url: err?.url
      });
      // If unauthorized or forbidden, try refreshing tokens once (uses httpOnly cookie)
      if (status === 401 || status === 403) {
        try {
          await this.authService.refreshTokens();
        } catch (refreshErr) {
          // Refresh failed — propagate original error
          throw err;
        }
        // Retry the original request after refresh
        return await fn();
      }
      throw err;
    }
  }

  private decodeJwtPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (payload.length % 4 !== 0) payload += '=';
      const json = atob(payload);
      return JSON.parse(json);
    } catch (e) {
      console.error('[AdminUsersService] Failed to decode JWT:', e);
      return null;
    }
  }
}
