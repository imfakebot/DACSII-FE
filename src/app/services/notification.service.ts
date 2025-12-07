import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface NotificationDto {
  id: string;
  title: string;
  body?: string | null;
  is_read: boolean;
  created_at: string;
  type?: string;
  related_id?: string;
}

export interface PaginatedNotificationResponse {
  data: NotificationDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private http: HttpClient) {}

  private authHeaders(): { headers: HttpHeaders } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async getNotifications(page = 1, limit = 10): Promise<PaginatedNotificationResponse> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return firstValueFrom(this.http.get<PaginatedNotificationResponse>(`/notification`, { params, ...this.authHeaders() }));
  }

  async markAllAsRead(): Promise<{ message: string }> {
    return firstValueFrom(this.http.patch<{ message: string }>(`/notification/read-all`, {}, this.authHeaders()));
  }

  /**
   * Get unread count for badge display
   */
  async getUnreadCount(): Promise<number> {
    // Check token exists before making API call
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      return 0;
    }
    
    try {
      const res = await this.getNotifications(1, 1);
      return res.meta?.unreadCount || 0;
    } catch (error) {
      // Return 0 on error instead of throwing
      return 0;
    }
  }
}
