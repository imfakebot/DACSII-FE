import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingManagementService } from '../services/booking-management.service';
import { BookingsService } from '../services/bookings.service';
import { AuthStateService } from '../services/auth-state.service';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-bookings.html'
})
export class AdminBookingsComponent implements OnInit {
  bookings: any[] = [];
  loading = false;
  error: string | null = null;
  page = 1;
  limit = 12;
  total = 0;
  totalPages = 1;
  pendingAction: string | null = null;
  statusFilter: string = '';
  successMessage: string | null = null;
  
  // Create booking modal
  showCreateModal = false;
  createBookingForm: any = {
    customerPhone: '',
    customerName: '',
    customerEmail: '',
    fieldId: '',
    startTime: '',
    durationMinutes: 60,
    notes: ''
  };
  creatingBooking = false;

  constructor(private mgmt: BookingManagementService, private bookingsSrv: BookingsService, private router: Router, private authState: AuthStateService) {}

  get isAdmin() { return this.authState.isAdmin(); }

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.error = 'Bạn không có quyền truy cập.';
      return;
    }
    this.load();
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      // Use BookingsService.getAdminBookings with status filter
      const res = await this.bookingsSrv.getAdminBookings(this.page, this.limit, this.statusFilter || undefined);
      console.log('[AdminBookings] raw response:', res);
      if (Array.isArray(res?.data) && res.data.length > 0) console.log('[AdminBookings] sample booking:', res.data[0]);
      // backend shape: { data: [], meta: { totalPages, totalItems } }
      this.bookings = (res.data || []).map((b: any) => {
        // normalize user/customer display
        const userFromAccount = b?.userProfile?.account || b?.user || null;
        const userFullName = b?.userProfile?.account?.userProfile?.full_name || b?.userProfile?.full_name || userFromAccount?.full_name || userFromAccount?.fullName || userFromAccount?.name || null;
        const userEmail = b?.userProfile?.account?.email || userFromAccount?.email || b?.user?.email || null;

        // normalize field name and start time keys
        const fieldName = b?.field?.name || b?.fieldName || b?.field?.title || null;
        const startTime = b?.start_time || b?.startTime || b?.createdAt || null;

        const rawStatus = this.resolveStatus(b);
        const statusNormalized = this.normalizeStatus(rawStatus);
        const statusLabel = this.getStatusLabel(rawStatus || statusNormalized || '');

        // If we still couldn't determine a label, log the booking for debugging
        if (!statusLabel || statusLabel === '-') {
          console.debug('[AdminBookings] unknown status for booking', { id: b?.id, rawStatus, statusNormalized, booking: b });
        }

        return {
          ...b,
          user: {
            fullName: userFullName || b?.customerName || 'Khách',
            email: userEmail || b?.customerEmail || ''
          },
          fieldName,
          startTime,
          statusNormalized,
          statusLabel,
          // ensure `status` property exists for other logic
          status: b?.status ?? b?.bookingStatus ?? b?.booking_status ?? rawStatus,
        };
      });
      this.total = res.meta?.totalItems || 0;
      this.totalPages = res.meta?.totalPages || 1;
    } catch (e: any) {
      console.warn('load bookings failed', e);
      // Map HTTP 401 / Unauthorized to friendly Vietnamese message and clear client auth state
      const statusCode = e?.status || e?.error?.status || null;
      const errMsg = e?.error?.message || e?.message || '';
      if (statusCode === 401 || /unauthor/i.test(String(errMsg))) {
        this.error = 'Bạn chưa đăng nhập.';
        // Clear client auth state so header updates (hides Đăng xuất)
        try { this.authState.setUser(null); } catch (_) {}
      } else {
        this.error = errMsg || 'Không tải được danh sách đặt sân.';
      }
    } finally {
      this.loading = false;
    }
  }

  canPrev() { return this.page > 1; }
  canNext() { return this.page * this.limit < (this.total || 0); }

  prev() { if (this.canPrev()) { this.page--; this.load(); } }
  next() { if (this.canNext()) { this.page++; this.load(); } }

  viewBooking(id: string) { this.router.navigate([`/admin/bookings/${id}`]); }

  async doCheckIn(b: any) {
    if (!confirm('Xác nhận check-in booking này?')) return;
    this.pendingAction = `checkin:${b.id}`;
    try {
      await this.bookingsSrv.checkIn(b.id);
      alert('Check-in thành công!');
      await this.load();
    } catch (e: any) {
      const statusCode = e?.status || e?.error?.status || null;
      const errMsg = e?.error?.message || e?.message || '';
      if (statusCode === 401 || /unauthor/i.test(String(errMsg))) {
        alert('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
        try { this.authState.setUser(null); } catch (_) {}
      } else {
        alert(errMsg || 'Check-in thất bại');
      }
    }
    finally { this.pendingAction = null; }
  }

  async doCancel(b: any) {
    if (!confirm('Xác nhận hủy booking này?')) return;
    this.pendingAction = `cancel:${b.id}`;
    try {
      await this.bookingsSrv.cancel(b.id);
      await this.load();
    } catch (e: any) {
      const statusCode = e?.status || e?.error?.status || null;
      const errMsg = e?.error?.message || e?.message || '';
      if (statusCode === 401 || /unauthor/i.test(String(errMsg))) {
        alert('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
        try { this.authState.setUser(null); } catch (_) {}
      } else {
        alert(errMsg || 'Hủy thất bại');
      }
    }
    finally { this.pendingAction = null; }
  }

  onStatusFilterChange() {
    this.page = 1;
    this.load();
  }

  openCreateModal() {
    this.showCreateModal = true;
    // Reset form
    this.createBookingForm = {
      customerPhone: '',
      customerName: '',
      customerEmail: '',
      fieldId: '',
      startTime: '',
      durationMinutes: 60,
      notes: ''
    };
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  async submitCreateBooking() {
    this.creatingBooking = true;
    this.error = null;
    
    try {
      const payload = {
        customerPhone: this.createBookingForm.customerPhone,
        customerName: this.createBookingForm.customerName,
        customerEmail: this.createBookingForm.customerEmail || undefined,
        fieldId: this.createBookingForm.fieldId,
        startTime: this.createBookingForm.startTime,
        durationMinutes: Number(this.createBookingForm.durationMinutes),
        notes: this.createBookingForm.notes || undefined
      };
      
      await this.bookingsSrv.createBookingByAdmin(payload);
      this.successMessage = 'Tạo booking thành công!';
      this.closeCreateModal();
      await this.load();
      
      setTimeout(() => {
        this.successMessage = null;
      }, 5000);
    } catch (err: any) {
      const statusCode = err?.status || err?.error?.status || null;
      const errMsg = err?.error?.message || err?.message || '';
      if (statusCode === 401 || /unauthor/i.test(String(errMsg))) {
        this.error = 'Bạn chưa đăng nhập.';
        try { this.authState.setUser(null); } catch (_) {}
      } else {
        this.error = errMsg || 'Tạo booking thất bại';
      }
    } finally {
      this.creatingBooking = false;
    }
  }

  getStatusClass(status: string): string {
    const key = this.normalizeStatus(status);
    const statusMap: Record<string, string> = {
      'PENDING_PAYMENT': 'status-pending',
      'PENDING': 'status-pending',
      'CONFIRMED': 'status-confirmed',
      'CHECKED_IN': 'status-checked-in',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled',
      'EXPIRED': 'status-expired'
    };
    return statusMap[key] || 'status-default';
  }

  getStatusCount(status: string): number {
    const key = this.normalizeStatus(status);
    return this.bookings.filter(b => this.normalizeStatus(b.status || b.bookingStatus || b.statusNormalized) === key).length;
  }

  formatTime(time: string): string {
    if (!time) return '-';
    try {
      const d = new Date(time);
      return d.toLocaleString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return time;
    }
  }

  getStatusLabel(status: string): string {
    const key = this.normalizeStatus(status);
    const labelMap: Record<string, string> = {
      'PENDING_PAYMENT': 'Chờ thanh toán',
      'PENDING': 'Chờ thanh toán',
      'CONFIRMED': 'Đã xác nhận',
      'CHECKED_IN': 'Đã check-in',
      'COMPLETED': 'Đã thanh toán',
      'CANCELLED': 'Đã hủy',
      'EXPIRED': 'Hết hạn'
    };
    return labelMap[key] || (status || '-');
  }

  normalizeStatus(status: string): string {
    if (!status) return '';
    let s = status.toString().trim().toUpperCase();
    // Replace any non-alphanumeric sequence (spaces, hyphens, etc.) with underscore
    s = s.replace(/[^A-Z0-9]+/g, '_');
    // Trim leading/trailing underscores
    s = s.replace(/^_+|_+$/g, '');
    // Canonicalize common variants to single token
    if (['CHECKED', 'CHECKIN', 'CHECKEDIN', 'CHECK_IN'].includes(s)) return 'CHECKED_IN';
    return s;
  }

  /**
   * Resolve the status string from various possible booking shapes.
   * Accepts either a raw status value or a booking object.
   */
  resolveStatus(val: any): string {
    if (!val) return '';
    if (typeof val === 'string' || typeof val === 'number') return String(val);
    const b = val;
    const tryStrings = (v: any) => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'string' || typeof v === 'number') return String(v);
      if (typeof v === 'object') {
        if (v.name) return String(v.name);
        if (v.value) return String(v.value);
        if (v.code) return String(v.code);
        if (v.status) return tryStrings(v.status);
        if (v.label) return String(v.label);
      }
      return '';
    };

    const candidates = [
      b.status, b.bookingStatus, b.booking_status, b.status_code, b.statusCode, b.state,
      b.status?.name, b.bookingStatus?.name, b.booking_status?.name, b.state?.name,
      b.status?.value, b.bookingStatus?.value, b.status?.label, b.bookingStatus?.label,
      b.status?.status, b.bookingStatus?.status, b.statusId, b.status_id
    ];

    for (const c of candidates) {
      const s = tryStrings(c);
      if (s) return s;
    }

    // Some backends return boolean flags instead of a status string.
    // Check common boolean properties and map them to canonical statuses.
    const boolChecks = [
      'checkedIn', 'checked_in', 'isCheckedIn', 'is_checked_in', 'checked', 'is_checked',
      'paid', 'isPaid', 'is_paid', 'completed'
    ];
    for (const flag of boolChecks) {
      if (Object.prototype.hasOwnProperty.call(b, flag)) {
        const val = (b as any)[flag];
        if (val === true || String(val) === '1' || String(val).toLowerCase() === 'true') {
          if (flag.includes('paid') || flag === 'completed' || flag === 'isPaid' || flag === 'is_paid') return 'COMPLETED';
          return 'CHECKED_IN';
        }
      }
    }

    return '';
  }

  canCheckIn(booking: any): boolean {
    // Use normalized status to decide
    const normalized = this.normalizeStatus(booking.status || booking.statusNormalized || booking.bookingStatus || '');
    // Allow check-in only for bookings that are confirmed or pending (not already completed)
    const allowed = ['CONFIRMED', 'PENDING_PAYMENT', 'PENDING'];
    const can = allowed.includes(normalized);
    console.log('🔍 canCheckIn debug:', { bookingId: booking.id, normalized, can });
    return can && normalized !== 'CHECKED_IN';
  }

  canCancel(booking: any): boolean {
    const normalized = this.normalizeStatus(booking.status || booking.statusNormalized || booking.bookingStatus || '');
    const cancelable = ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED', 'COMPLETED'];
    return cancelable.includes(normalized);
  }

  showActions(booking: any): boolean {
    // Luôn hiện nút hành động
    return true;
  }

  formatDateTime(isoString: string): string {
    if (!isoString) return 'N/A';
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

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.page - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    this.page = page;
    this.load();
  }
}

