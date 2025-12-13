import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FeedbacksService, FeedbackDto } from '../services/feedbacks.service';

@Component({
  selector: 'app-admin-feedbacks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-feedbacks.html',
  styleUrl: './admin-feedbacks.scss',
})
export class AdminFeedbacksComponent implements OnInit {
  feedbacks: FeedbackDto[] = [];
  filteredFeedbacks: FeedbackDto[] = [];
  loading = false;
  error: string | null = null;
  
  // Filter state
  statusFilter: string = 'all';
  searchQuery: string = '';
  
  // Quick reply state
  replyingToId: string | null = null;
  replyMessage: string = '';
  replyLoading = false;
  replySuccess: string | null = null;
  replyError: string | null = null;

  constructor(
    private svc: FeedbacksService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.feedbacks = await this.svc.getAllAdmin();
      this.applyFilters();
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không tải được feedbacks';
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    let results = [...this.feedbacks];
    
    // Status filter
    if (this.statusFilter !== 'all') {
      results = results.filter(f => f.status === this.statusFilter);
    }
    
    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      results = results.filter(f => 
        (f.title || f.subject || '').toLowerCase().includes(query) ||
        f.user?.full_name?.toLowerCase().includes(query) ||
        f.user?.email?.toLowerCase().includes(query) ||
        f.submitter?.full_name?.toLowerCase().includes(query) ||
        f.submitter?.email?.toLowerCase().includes(query)
      );
    }
    
    this.filteredFeedbacks = results;
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  viewDetail(id: string): void {
    this.router.navigate(['/admin/feedback', id]);
  }

  toggleQuickReply(id: string): void {
    if (this.replyingToId === id) {
      this.replyingToId = null;
      this.replyMessage = '';
      this.replyError = null;
      this.replySuccess = null;
    } else {
      this.replyingToId = id;
      this.replyMessage = '';
      this.replyError = null;
      this.replySuccess = null;
    }
  }

  async submitQuickReply(id: string): Promise<void> {
    if (!this.replyMessage.trim()) {
      this.replyError = 'Vui lòng nhập nội dung trả lời';
      return;
    }

    this.replyLoading = true;
    this.replyError = null;
    this.replySuccess = null;
    
    try {
      await this.svc.reply(id, { content: this.replyMessage });
      this.replySuccess = 'Đã gửi phản hồi thành công!';
      this.replyMessage = '';
      
      // Reload to get updated data
      setTimeout(() => {
        this.replyingToId = null;
        this.replySuccess = null;
        this.load();
      }, 1500);
    } catch (err: any) {
      this.replyError = err?.error?.message || err?.message || 'Không thể gửi phản hồi';
    } finally {
      this.replyLoading = false;
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'open': 'Mới',
      'in_progress': 'Đang xử lý',
      'resolved': 'Đã giải quyết',
      'closed': 'Đã đóng'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  formatDateTime(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleString('vi-VN');
  }

  getRelativeTime(date: any): string {
    if (!date) return '';
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return this.formatDateTime(date);
  }

  getResponseCount(feedback: FeedbackDto): number {
    return feedback.responses?.length || 0;
  }

  hasUnreadResponses(feedback: FeedbackDto): boolean {
    // Logic for unread - can be enhanced based on backend
    return feedback.status === 'open' && this.getResponseCount(feedback) === 0;
  }
}
