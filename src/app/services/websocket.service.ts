import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface NotificationPayload {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: Socket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  private notification$ = new BehaviorSubject<NotificationPayload | null>(null);
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Kết nối WebSocket với backend
   * Sử dụng token từ localStorage để xác thực
   */
  connect(): void {
    // Only connect in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Already connected
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('[WebSocket] No access token found. Cannot connect.');
      return;
    }

    // Xác định URL WebSocket từ environment hoặc window.location
    const wsUrl = environment.apiUrl || `${window.location.protocol}//${window.location.hostname}:3000`;
    
    console.log('[WebSocket] Connecting to:', wsUrl);
    
    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected successfully');
      this.connected$.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.connected$.next(false);
    });

    // Lắng nghe thông báo real-time từ BE
    this.socket.on('new_notification', (payload: NotificationPayload) => {
      console.log('[WebSocket] New notification received:', payload);
      this.notification$.next(payload);
    });

    // Lắng nghe feedback mới (dành cho admin)
    this.socket.on('new_feedback_created', (payload: any) => {
      console.log('[WebSocket] New feedback created:', payload);
      // Admin có thể lắng nghe event này để hiển thị badge
    });

    // Lắng nghe tin nhắn chat (dành cho feedback detail)
    this.socket.on('receive_message', (payload: any) => {
      console.log('[WebSocket] New message received:', payload);
      // Feedback detail component sẽ lắng nghe event này
    });
  }

  /**
   * Ngắt kết nối WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.connected$.next(false);
    }
  }

  /**
   * Tham gia phòng chat feedback (cho feedback detail page)
   */
  joinFeedbackRoom(feedbackId: string): void {
    if (this.socket?.connected) {
      console.log(`[WebSocket] Joining feedback room: ${feedbackId}`);
      this.socket.emit('join_feedback_room', feedbackId);
    }
  }

  /**
   * Rời khỏi phòng chat feedback
   */
  leaveFeedbackRoom(feedbackId: string): void {
    if (this.socket?.connected) {
      console.log(`[WebSocket] Leaving feedback room: ${feedbackId}`);
      this.socket.emit('leave_feedback_room', feedbackId);
    }
  }

  /**
   * Observable để theo dõi trạng thái kết nối
   */
  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  /**
   * Observable để nhận thông báo real-time
   */
  onNotification(): Observable<NotificationPayload | null> {
    return this.notification$.asObservable();
  }

  /**
   * Lắng nghe event tùy chỉnh
   */
  on(eventName: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  /**
   * Hủy lắng nghe event
   */
  off(eventName: string): void {
    if (this.socket) {
      this.socket.off(eventName);
    }
  }

  /**
   * Emit event đến server
   */
  emit(eventName: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(eventName, data);
    }
  }
}
