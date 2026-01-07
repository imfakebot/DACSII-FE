import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingsService } from '../services/bookings.service';
import { PaymentService } from '../services/payment.service';
import { AuthStateService } from '../services/auth-state.service';
import { IdEncoderService } from '../services/id-encoder.service';

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
    private authState: AuthStateService,
    private router: Router,
    private idEncoder: IdEncoderService
  ) { }

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

      // Map bookings with status normalization and enhanced data
      this.bookings = (response.data || []).map((b: any) => {
        let rawStatus = this.resolveStatus(b);

        console.log('[MyBookings] Booking raw data:', {
          id: b.id?.substring(0, 8),
          status_from_api: b.status,
          check_in_at: b.check_in_at,
          rawStatus: rawStatus,
          entire_booking: b
        });

        // Fallback: infer status from timestamps if status is empty
        if (!rawStatus || rawStatus.trim() === '') {
          if (b.check_in_at || b.checkInAt || b.checkedInAt) {
            rawStatus = 'checked_in';
            console.log('[MyBookings] ⚠️ STATUS RỖNG! Suy luận từ check_in_at → checked_in');
          } else if (b.completed_at || b.completedAt) {
            rawStatus = 'completed';
          } else if (b.cancelled_at || b.cancelledAt || b.canceled_at) {
            rawStatus = 'cancelled';
          } else if (b.confirmed_at || b.confirmedAt) {
            rawStatus = 'confirmed';
          } else if (b.total_price && parseFloat(b.total_price) > 0) {
            rawStatus = 'pending';
          }
        }

        const normalizedStatus = this.normalizeStatus(rawStatus);

        console.log('[MyBookings] ✅ Final:', `ID: ${b.id?.substring(0, 8)}, rawStatus: "${rawStatus}", normalized: "${normalizedStatus}", canReview: ${normalizedStatus === 'checked_in' || normalizedStatus === 'completed'}`);

        // Calculate duration if not provided
        let duration = b.duration_minutes || b.duration || 0;
        if (!duration && b.start_time && b.end_time) {
          const start = new Date(b.start_time);
          const end = new Date(b.end_time);
          duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        }

        return {
          ...b,
          status: normalizedStatus,
          duration_minutes: duration,
          field: {
            name: b.field?.name || b.fieldName || '-',
            branch: {
              name: b.field?.branch?.name || b.branchName || '-'
            }
          }
        };
      });

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
        try { this.authState.setUser(null); } catch (_) { }
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
    const cancelableStatuses = ['pending', 'confirmed', 'completed'];
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

  normalizeStatus(status: string): string {
    if (!status) return 'pending';
    const s = status.toString().trim().toLowerCase();

    // Map various status formats to normalized values
    const statusMap: Record<string, string> = {
      'pending_payment': 'pending',
      'pending': 'pending',
      'confirmed': 'confirmed',
      'checked_in': 'checked_in',
      'checkedin': 'checked_in',
      'check_in': 'checked_in',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'finished': 'finished',
      'expired': 'expired'
    };

    return statusMap[s] || s;
  }

  resolveStatus(booking: any): string {
    if (!booking) return '';

    const candidates = [
      booking.status,
      booking.bookingStatus,
      booking.booking_status,
      booking.statusCode,
      booking.status_code,
      booking.state
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
      if (candidate && typeof candidate === 'object') {
        if (candidate.name) return String(candidate.name);
        if (candidate.value) return String(candidate.value);
        if (candidate.code) return String(candidate.code);
      }
    }

    return '';
  }

  canReview(booking: any): boolean {
    // Can review if checked-in or completed (customer has used the field)
    return booking.status === 'checked_in' || booking.status === 'completed';
  }

  goToReview(bookingId: string) {
    // Encode booking ID and navigate to review page using Angular router
    const encodedId = this.idEncoder.encode(bookingId);
    this.router.navigate(['/review'], { queryParams: { bookingId: encodedId } });
  }
}
