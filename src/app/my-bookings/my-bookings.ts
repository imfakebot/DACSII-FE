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
    // Only load bookings after auth state is ready and user has a valid id
    this.authState.ready$.subscribe((r) => {
      if (!r) return;
      const user = this.authState.getCurrentUser();
      // Basic UUID v4-ish check (36 chars, hex + dashes)
      const isValidId = !!user && typeof user.id === 'string' && /^[0-9a-fA-F-]{36}$/.test(user.id);
      if (!isValidId) {
        this.error = 'Vui lòng đăng nhập để xem lịch sử đặt sân.';
        // Don't auto-logout - just show message
        return;
      }
      this.loadBookings();
    });

    // Also react to user changes (e.g., login/logout) and reload when valid
    this.authState.user$.subscribe((u) => {
      const isValid = !!u && typeof u.id === 'string' && /^[0-9a-fA-F-]{36}$/.test(u.id);
      if (isValid) {
        this.error = null;
        this.loadBookings();
      } else {
        // Ensure UI won't attempt API calls with bad id
        this.bookings = [];
        this.totalPages = 1;
        this.totalItems = 0;
        if (u === null) this.error = null; // no message when explicitly logged out
      }
    });
  }

  async loadBookings() {
    this.loading = true;
    this.error = null;
    
    // Debug auth state
    const user = this.authState.getCurrentUser();
    console.log('[MyBookings] Current user:', user);
    console.log('[MyBookings] Is logged in:', this.authState.isLoggedIn());
    
    try {
      const filters: any = {};
      if (this.statusFilter && this.statusFilter.trim()) {
        filters.status = this.statusFilter;
      }
      
      // Only pass filters if it has properties
      const hasFilters = Object.keys(filters).length > 0;
      const response = await this.bookingsService.getMyBookings(
        this.currentPage, 
        this.limit, 
        hasFilters ? filters : undefined
      );
      this.bookings = response.data || [];
      this.totalPages = response.meta?.totalPages || 1;
      this.totalItems = response.meta?.totalItems || 0;
    } catch (e: any) {
      console.error('[MyBookings] Error loading bookings:', e);
      console.error('[MyBookings] Error details:', {
        status: e?.status,
        statusText: e?.statusText,
        error: e?.error,
        message: e?.message,
        url: e?.url
      });
      const statusCode = e?.status || e?.error?.status || null;
      const errMsg = e?.error?.message || e?.message || '';
      
      // Only clear auth on explicit 401 Unauthorized
      if (statusCode === 401 || /unauthor/i.test(String(errMsg))) {
        this.error = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        try { this.authState.setUser(null); } catch (_) {}
      } else if (statusCode === 400) {
        // 400 is validation error - don't logout, just show error
        this.error = 'Không thể tải danh sách. Vui lòng thử lại sau.';
        console.warn('[MyBookings] 400 error - possible backend validation issue');
      } else {
        this.error = errMsg || 'Không thể tải danh sách đặt sân';
      }
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
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'checked_in': 'status-checked-in',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled',
      'finished': 'status-finished',
      'expired': 'status-expired'
    };
    return statusMap[status] || 'status-default';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'pending': 'Chờ thanh toán',
      'confirmed': 'Đã xác nhận',
      'checked_in': 'Đã check-in',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy',
      'finished': 'Đã kết thúc',
      'expired': 'Hết hạn'
    };
    return labelMap[status] || status;
  }

  canCancel(booking: any): boolean {
    // Can only cancel if status is pending or confirmed
    const cancelableStatuses = ['pending', 'confirmed'];
    return cancelableStatuses.includes(booking.status);
  }

  canPay(booking: any): boolean {
    return booking.status === 'pending';
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
