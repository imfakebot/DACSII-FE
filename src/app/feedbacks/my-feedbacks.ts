import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FeedbacksService, CreateFeedbackDto, FeedbackDto } from '../services/feedbacks.service';
import { IdEncoderService } from '../services/id-encoder.service';

@Component({
  selector: 'app-my-feedbacks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-feedbacks.html',
  styleUrl: './my-feedbacks.scss',
})
export class MyFeedbacksComponent implements OnInit {
  feedbacks: FeedbackDto[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Create new ticket form
  showCreateForm = false;
  newTicket: CreateFeedbackDto = {
    title: '',
    category: 'support',
    content: ''
  };
  creating = false;

  categories = [
    { value: 'support', label: 'Yêu cầu hỗ trợ' },
    { value: 'suggestion', label: 'Góp ý / Đề xuất' },
    { value: 'complaint', label: 'Khiếu nại' },
    { value: 'inquiry', label: 'Câu hỏi / Tư vấn' },
    { value: 'other', label: 'Khác' }
  ];

  constructor(
    private feedbacksService: FeedbacksService,
    private router: Router,
    private idEncoder: IdEncoderService  // Service mã hóa ID để ẩn UUID trong URL
  ) {}

  async ngOnInit() {
    await this.loadMyFeedbacks();
  }

  async loadMyFeedbacks() {
    this.loading = true;
    this.error = null;
    
    try {
      this.feedbacks = await this.feedbacksService.getMyFeedbacks();
    } catch (e: any) {
      console.error('Error loading feedbacks:', e);
      this.error = e?.error?.message || e?.message || 'Không thể tải danh sách ticket';
    } finally {
      this.loading = false;
    }
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.resetForm();
    }
  }

  resetForm() {
    this.newTicket = { title: '', category: 'support', content: '' };
    this.error = null;
    this.successMessage = null;
  }

  async createTicket() {
    if (!this.newTicket.title.trim() || !this.newTicket.content.trim()) {
      this.error = 'Vui lòng nhập đầy đủ tiêu đề và nội dung';
      return;
    }

    this.creating = true;
    this.error = null;
    
    console.log('[Create Ticket] Payload:', this.newTicket);
    
    try {
      const result = await this.feedbacksService.create(this.newTicket);
      console.log('[Create Ticket] Success:', result);
      this.successMessage = 'Tạo ticket thành công!';
      this.showCreateForm = false;
      this.resetForm();
      // Avoid immediately calling /feedbacks/me (server may not include
      // userProfile in the auth payload and that causes a backend crash).
      // Instead update local list using the response from the create call.
      if (result) {
        this.feedbacks = [result, ...(this.feedbacks || [])];
      } else {
        // Fallback in case backend returns no body
        await this.loadMyFeedbacks();
      }

      setTimeout(() => {
        this.successMessage = null;
      }, 3000);
    } catch (e: any) {
      console.error('[Create Ticket] Error:', e);
      console.error('[Create Ticket] Error Response:', e?.error);
      console.error('[Create Ticket] Error Message:', e?.error?.message);
      this.error = e?.error?.message || e?.message || 'Không thể tạo ticket';
    } finally {
      this.creating = false;
    }
  }

  /**
   * Xem chi tiết feedback - mã hóa ID trước khi navigate
   */
  viewDetail(feedbackId: string) {
    // Mã hóa ID thành chuỗi ngắn để ẩn UUID
    const encodedId = this.idEncoder.encode(feedbackId);
    this.router.navigate(['/feedbacks', encodedId]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'open': 'Mới',
      'in_progress': 'Đang xử lý',
      'resolved': 'Đã giải quyết',
      'closed': 'Đã đóng'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status.replace('_', '-')}`;
  }

  getCategoryLabel(category: string): string {
    const cat = this.categories.find(c => c.value === category);
    return cat ? cat.label : category;
  }

  formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRelativeTime(isoString: string): string {
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
    
    return this.formatDateTime(isoString);
  }
}
