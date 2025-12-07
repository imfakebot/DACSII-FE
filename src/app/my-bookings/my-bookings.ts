import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingsService } from '../services/bookings.service';
import { PaymentService } from '../services/payment.service';
import { AuthStateService } from '../services/auth-state.service';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-bookings.html',
  styleUrls: ['./my-bookings.scss']
})
export class MyBookingsComponent implements OnInit {
  bookings: any[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  limit = 10;
  
  // Filters
  statusFilter: string = '';
  
  // Cancel confirmation
  cancelingBookingId: string | null = null;
  showCancelModal = false;

  constructor(
    private bookingsService: BookingsService,
    private payment: PaymentService,
    private authState: AuthStateService
  ) {}

  ngOnInit() {
    this.loadBookings();
  }

  async loadBookings() {
    this.loading = true;
    this.error = null;
    
    try {
      const filters: any = {};
      if (this.statusFilter) {
        filters.status = this.statusFilter;
      }
      
      const response = await this.bookingsService.getMyBookings(this.currentPage, this.limit, filters);
      this.bookings = response.data || [];
      this.totalPages = response.meta?.totalPages || 1;
      this.totalItems = response.meta?.totalItems || 0;
    } catch (e: any) {
      console.error('Error loading bookings:', e);
      this.error = e?.error?.message || e?.message || 'Không thể tải danh sách đặt sân';
    } finally {
      this.loading = false;
    }
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadBookings();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadBookings();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadBookings();
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadBookings();
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

  openCancelModal(bookingId: string) {
    this.cancelingBookingId = bookingId;
    this.showCancelModal = true;
  }

  closeCancelModal() {
    this.cancelingBookingId = null;
    this.showCancelModal = false;
  }

  async confirmCancel() {
    if (!this.cancelingBookingId) return;
    
    try {
      const response = await this.bookingsService.cancel(this.cancelingBookingId);
      this.successMessage = response.message || 'Hủy đặt sân thành công';
      this.closeCancelModal();
      this.loadBookings();
      
      // Clear success message after 5s
      setTimeout(() => {
        this.successMessage = null;
      }, 5000);
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || 'Không thể hủy đặt sân';
      this.closeCancelModal();
      
      // Clear error after 5s
      setTimeout(() => {
        this.error = null;
      }, 5000);
    }
  }

  async pay(bookingId: string) {
    try {
      const res = await this.payment.createPaymentUrl(bookingId);
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || 'Không thể tạo link thanh toán';
      setTimeout(() => {
        this.error = null;
      }, 5000);
    }
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING_PAYMENT': 'status-pending',
      'CONFIRMED': 'status-confirmed',
      'CHECKED_IN': 'status-checked-in',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled',
      'EXPIRED': 'status-expired'
    };
    return statusMap[status] || 'status-default';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'PENDING_PAYMENT': 'Chờ thanh toán',
      'CONFIRMED': 'Đã xác nhận',
      'CHECKED_IN': 'Đã check-in',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy',
      'EXPIRED': 'Hết hạn'
    };
    return labelMap[status] || status;
  }

  canCancel(booking: any): boolean {
    // Can only cancel if status is PENDING_PAYMENT or CONFIRMED
    const cancelableStatuses = ['PENDING_PAYMENT', 'CONFIRMED'];
    return cancelableStatuses.includes(booking.status);
  }

  canPay(booking: any): boolean {
    return booking.status === 'PENDING_PAYMENT';
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }
}
