import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, NotificationDto } from '../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: NotificationDto[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Pagination
  currentPage = 1;
  limit = 15;
  totalPages = 1;
  totalItems = 0;
  unreadCount = 0;
  
  // Filter
  showUnreadOnly = false;
  
  // Auto refresh
  private refreshInterval: any = null;
  private subscriptions: Subscription[] = [];

  constructor(private notificationService: NotificationService) {}

  async ngOnInit() {
    await this.loadNotifications();
    this.startAutoRefresh();
    this.listenForNewNotifications();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Lắng nghe thông báo mới real-time
   */
  private listenForNewNotifications(): void {
    const sub = this.notificationService.getNewNotification$().subscribe(notification => {
      if (notification) {
        // Thêm thông báo mới vào đầu danh sách
        this.notifications.unshift(notification);
        
        // Cập nhật unread count
        this.unreadCount++;
        
        // Hiển thị toast hoặc notification
        this.showNotificationToast(notification);
      }
    });
    this.subscriptions.push(sub);
  }

  /**
   * Hiển thị toast khi có thông báo mới
   */
  private showNotificationToast(notification: NotificationDto): void {
    // Có thể dùng library như ngx-toastr hoặc tự làm
    console.log('New notification:', notification);
    
    // Tạm thời dùng browser notification (cần permission)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.content || notification.body || '',
        icon: '/assets/logoHaiAnhEm.png'
      });
    }
  }

  async loadNotifications() {
    this.loading = true;
    this.error = null;
    
    try {
      const response = await this.notificationService.getNotifications(this.currentPage, this.limit);
      
      if (this.showUnreadOnly) {
        this.notifications = response.data.filter(n => !n.is_read && !n.isRead);
      } else {
        this.notifications = response.data;
      }
      
      this.totalItems = response.meta?.total || 0;
      this.totalPages = response.meta?.lastPage || response.meta?.totalPages || 1;
      this.unreadCount = response.meta?.unreadCount || 0;
      
      // Cập nhật unread count trong service để header cũng cập nhật
      this.notificationService.updateUnreadCount(this.unreadCount);
    } catch (e: any) {
      console.error('Error loading notifications:', e);
      this.error = e?.error?.message || e?.message || 'Không thể tải thông báo';
    } finally {
      this.loading = false;
    }
  }

  async markAllAsRead() {
    try {
      const response = await this.notificationService.markAllAsRead();
      this.successMessage = response.message || 'Đã đánh dấu tất cả là đã đọc';
      
      // Cập nhật UI ngay lập tức
      this.notifications.forEach(n => {
        n.is_read = true;
        n.isRead = true;
      });
      this.unreadCount = 0;
      this.notificationService.updateUnreadCount(0);
      
      setTimeout(() => {
        this.successMessage = null;
      }, 3000);
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || 'Không thể đánh dấu là đã đọc';
      setTimeout(() => {
        this.error = null;
      }, 3000);
    }
  }

  toggleUnreadFilter() {
    this.showUnreadOnly = !this.showUnreadOnly;
    this.currentPage = 1;
    this.loadNotifications();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadNotifications();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadNotifications();
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadNotifications();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getNotificationIcon(notification: NotificationDto): string {
    const title = notification.title.toLowerCase();
    if (title.includes('đặt sân') || title.includes('booking')) return 'fa-calendar-check';
    if (title.includes('thanh toán') || title.includes('payment')) return 'fa-credit-card';
    if (title.includes('hủy') || title.includes('cancel')) return 'fa-times-circle';
    if (title.includes('hoàn tiền') || title.includes('refund')) return 'fa-money-bill-wave';
    if (title.includes('nhắc nhở') || title.includes('reminder')) return 'fa-clock';
    return 'fa-bell';
  }

  getNotificationClass(notification: NotificationDto): string {
    const title = notification.title.toLowerCase();
    if (title.includes('thành công') || title.includes('success')) return 'success';
    if (title.includes('hủy') || title.includes('thất bại') || title.includes('failed')) return 'error';
    if (title.includes('nhắc nhở') || title.includes('reminder')) return 'warning';
    return 'info';
  }

  formatDateTime(isoString?: string): string {
    if (!isoString) return 'N/A';
    
    try {
      const date = new Date(isoString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return 'N/A';
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays < 7) return `${diffDays} ngày trước`;
      
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  }

  private startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadNotifications();
    }, 30000);
  }

  private stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}
