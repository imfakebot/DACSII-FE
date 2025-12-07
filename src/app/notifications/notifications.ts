import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, NotificationDto } from '../services/notification.service';

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

  constructor(private notificationService: NotificationService) {}

  async ngOnInit() {
    await this.loadNotifications();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  async loadNotifications() {
    this.loading = true;
    this.error = null;
    
    try {
      const response = await this.notificationService.getNotifications(this.currentPage, this.limit);
      
      if (this.showUnreadOnly) {
        this.notifications = response.data.filter(n => !n.is_read);
      } else {
        this.notifications = response.data;
      }
      
      this.totalItems = response.meta?.total || 0;
      this.totalPages = response.meta?.totalPages || 1;
      this.unreadCount = response.meta?.unreadCount || 0;
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
      await this.loadNotifications();
      
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
    if (notification.title.includes('Đặt sân')) return 'fa-calendar-check';
    if (notification.title.includes('Thanh toán')) return 'fa-credit-card';
    if (notification.title.includes('Hủy')) return 'fa-times-circle';
    if (notification.title.includes('Hoàn tiền')) return 'fa-money-bill-wave';
    return 'fa-bell';
  }

  getNotificationClass(notification: NotificationDto): string {
    if (notification.title.includes('thành công')) return 'success';
    if (notification.title.includes('Hủy') || notification.title.includes('thất bại')) return 'error';
    if (notification.title.includes('Nhắc nhở')) return 'warning';
    return 'info';
  }

  formatDateTime(isoString: string): string {
    const date = new Date(isoString);
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
