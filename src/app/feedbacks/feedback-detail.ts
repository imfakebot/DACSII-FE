import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FeedbacksService, FeedbackDto } from '../services/feedbacks.service';
import { AuthStateService } from '../services/auth-state.service';
import { IdEncoderService } from '../services/id-encoder.service';

@Component({
  selector: 'app-feedback-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './feedback-detail.html',
  styleUrl: './feedback-detail.scss',
})
export class FeedbackDetailComponent implements OnInit {
  feedbackId!: string;  // ID thật (đã giải mã) để gọi API
  feedback: FeedbackDto | null = null;
  loading = false;
  error: string | null = null;
  isAdmin = false;
  
  // Reply state
  replyMessage: string = '';
  replyLoading = false;
  replySuccess: string | null = null;
  replyError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: FeedbacksService,
    private authState: AuthStateService,
    private idEncoder: IdEncoderService  // Service mã hóa/giải mã ID
  ) {}

  async ngOnInit(): Promise<void> {
    // Lấy ID đã mã hóa từ URL
    const encodedId = this.route.snapshot.paramMap.get('id');
    if (!encodedId) {
      this.error = 'ID không hợp lệ';
      return;
    }
    
    // Giải mã để có ID thật dùng gọi API
    this.feedbackId = this.idEncoder.decode(encodedId);
    
    if (!this.feedbackId) {
      this.error = 'ID không hợp lệ';
      return;
    }

    // Determine whether current user is admin to toggle admin-only UI
    try {
      this.isAdmin = this.authState.isAdmin();
    } catch (err) {
      this.isAdmin = false;
    }

    await this.loadDetail();
  }

  async loadDetail(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      this.feedback = await this.svc.getDetail(this.feedbackId);
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không tải được chi tiết phản hồi';
    } finally {
      this.loading = false;
    }
  }

  async submitReply(): Promise<void> {
    if (!this.replyMessage.trim()) {
      this.replyError = 'Vui lòng nhập nội dung trả lời';
      return;
    }

    this.replyLoading = true;
    this.replyError = null;
    this.replySuccess = null;
    
    try {
      await this.svc.reply(this.feedbackId, { content: this.replyMessage });
      this.replySuccess = 'Đã gửi phản hồi thành công!';
      this.replyMessage = '';
      
      // Reload to get updated conversation
      setTimeout(() => {
        this.replySuccess = null;
        this.loadDetail();
      }, 1500);
    } catch (err: any) {
      this.replyError = err?.error?.message || err?.message || 'Không thể gửi phản hồi';
    } finally {
      this.replyLoading = false;
    }
  }

  goBack(): void {
    if (this.isAdmin) {
      this.router.navigate(['/admin/feedbacks']);
    } else {
      this.router.navigate(['/feedbacks']);
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
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getSenderName(sender: any, senderType: string): string {
    if (!sender) return senderType === 'admin' ? 'Quản trị viên' : 'Người dùng';
    return sender.fullName || sender.email || (senderType === 'admin' ? 'Quản trị viên' : 'Người dùng');
  }

  getSenderLabel(senderType: string): string {
    return senderType === 'admin' ? 'Quản trị viên' : 'Khách hàng';
  }
}
