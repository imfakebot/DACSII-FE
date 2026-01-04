import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { WebSocketService } from './websocket.service';
import { BaseUrlService } from '../base_url';

export interface NotificationDto {
  id: string;
  title: string;
  content?: string;
  body?: string | null;
  isRead?: boolean;
  is_read?: boolean;
  created_at?: string;
  createdAt?: string;
  type?: string;
  related_id?: string;
}

export interface PaginatedNotificationResponse {
  data: NotificationDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    lastPage?: number;
    totalPages?: number;
    unreadCount: number;
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private unreadCount$ = new BehaviorSubject<number>(0);
  private newNotification$ = new BehaviorSubject<NotificationDto | null>(null);

  constructor(
    private http: HttpClient,
    private wsService: WebSocketService,
    private baseUrl: BaseUrlService
  ) {
    // Lắng nghe thông báo real-time từ WebSocket
    this.wsService.onNotification().subscribe(notification => {
      if (notification) {
        // Chuyển đổi format từ BE sang FE
        const notificationDto: NotificationDto = {
          id: notification.id,
          title: notification.title,
          content: notification.content,
          body: notification.content,
          isRead: notification.isRead,
          is_read: notification.isRead,
          createdAt: notification.createdAt,
          created_at: notification.createdAt
        };
        
        this.newNotification$.next(notificationDto);
        
        // Tăng unread count
        const currentCount = this.unreadCount$.value;
        this.unreadCount$.next(currentCount + 1);
      }
    });
  }

  private authHeaders(): { headers: HttpHeaders } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async getNotifications(page = 1, limit = 10): Promise<PaginatedNotificationResponse> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return firstValueFrom(this.http.get<PaginatedNotificationResponse>(`${this.baseUrl.getApiBaseUrl()}/notification`, { params, ...this.authHeaders() }));
  }

  async markAllAsRead(): Promise<{ message: string }> {
    return firstValueFrom(this.http.patch<{ message: string }>(`${this.baseUrl.getApiBaseUrl()}/notification/read-all`, {}, this.authHeaders()));
  }

  async getUnreadCount(): Promise<number> {
    // Check token exists before making API call
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      return 0;
    }
    
    try {
      const res = await this.getNotifications(1, 1);
      const count = res.meta?.unreadCount || 0;
      this.unreadCount$.next(count);
      return count;
    } catch (error) {
      // Return 0 on error instead of throwing
      return 0;
    }
  }

  /**
   * Observable để theo dõi số lượng thông báo chưa đọc real-time
   */
  getUnreadCount$(): Observable<number> {
    return this.unreadCount$.asObservable();
  }

  /**
   * Observable để nhận thông báo mới real-time
   */
  getNewNotification$(): Observable<NotificationDto | null> {
    return this.newNotification$.asObservable();
  }

  /**
   * Cập nhật unread count thủ công (dùng sau khi mark all as read)
   */
  updateUnreadCount(count: number): void {
    this.unreadCount$.next(count);
  }
}
