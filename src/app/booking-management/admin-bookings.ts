import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingManagementService } from '../services/booking-management.service';
import { BookingsService } from '../services/bookings.service';
import { AuthStateService } from '../services/auth-state.service';
import { IdEncoderService } from '../services/id-encoder.service';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ZXingScannerModule],
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

  // Check-in modal
  showCheckInModal = false;
  checkInBooking: any = null;
  checkingIn = false;

  // QR Scanner
  showQrScanner = false;
  qrScannerEnabled = false;
  qrScanError: string | null = null;
  qrScanSuccess: string | null = null;
  allowedFormats = [BarcodeFormat.QR_CODE];
  availableCameras: MediaDeviceInfo[] = [];
  selectedCamera: MediaDeviceInfo | undefined = undefined;

  constructor(
    private mgmt: BookingManagementService, 
    private bookingsSrv: BookingsService, 
    private router: Router, 
    private authState: AuthStateService,
    private idEncoder: IdEncoderService  // Service mã hóa ID
  ) {}

  get isAdmin() { return this.authState.isAdmin(); }
  get canManage() { return this.authState.canManage(); }
  get canAccessBookings() { return this.authState.canAccessBookings(); }

  ngOnInit(): void {
    if (!this.canAccessBookings) {
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

        let rawStatus = this.resolveStatus(b);
        
        // Fallback: If status is empty but we have timestamp fields, infer status
        if (!rawStatus || rawStatus.trim() === '') {
          if (b.check_in_at || b.checkInAt || b.checkedInAt) {
            rawStatus = 'CHECKED_IN';
          } else if (b.completed_at || b.completedAt) {
            rawStatus = 'COMPLETED';
          } else if (b.cancelled_at || b.cancelledAt || b.canceled_at) {
            rawStatus = 'CANCELLED';
          } else if (b.confirmed_at || b.confirmedAt) {
            rawStatus = 'CONFIRMED';
          }
        }
        
        const statusNormalized = this.normalizeStatus(rawStatus);
        const statusLabel = this.getStatusLabel(rawStatus || statusNormalized || '');

        // Log status resolution for debugging
        console.log('[AdminBookings] Status mapping for booking', b.id?.substring(0, 8), ':', {
          rawStatus,
          statusNormalized,
          statusLabel,
          timestamps: {
            check_in_at: b.check_in_at,
            completed_at: b.completed_at,
            cancelled_at: b.cancelled_at
          },
          originalBookingData: {
            status: b?.status,
            bookingStatus: b?.bookingStatus,
            booking_status: b?.booking_status,
            state: b?.state
          }
        });

        // If we still couldn't determine a label, log the booking for debugging
        if (!statusLabel || statusLabel === '-') {
          console.warn('[AdminBookings] Unknown status for booking', { id: b?.id, rawStatus, statusNormalized, booking: b });
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
          // Extract payment info if available
          payment: b?.payment || null,
          paymentStatus: b?.payment?.status || this.inferPaymentStatusFromBooking(statusNormalized),
        };
      });
      this.total = res.meta?.totalItems || 0;
      this.totalPages = res.meta?.totalPages || 1;
    } catch (e: any) {
      console.warn('load bookings failed', e);
      // Map HTTP 401/403 / Unauthorized to friendly Vietnamese message and clear client auth state
      const statusCode = e?.status || e?.error?.status || null;
      const errMsg = e?.error?.message || e?.message || '';
      if (statusCode === 401 || statusCode === 403 || /unauthor|forbidden/i.test(String(errMsg))) {
        this.error = 'Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.';
        // Clear client auth state so header updates (hides Đăng xuất)
        try { 
          this.authState.setUser(null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        } catch (_) {}
        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/Login/login']);
        }, 2000);
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

  viewBooking(id: string) { 
    const encodedId = this.idEncoder.encode(id);  // Mã hóa ID trước khi hiển thị URL
    this.router.navigate([`/admin/bookings/${encodedId}`]); 
  }

  async doCheckIn(b: any) {
    // Hiển thị modal xác nhận với thông tin chi tiết
    this.checkInBooking = b;
    this.showCheckInModal = true;
  }

  async confirmCheckIn() {
    if (!this.checkInBooking) return;
    
    this.checkingIn = true;
    this.pendingAction = `checkin:${this.checkInBooking.id}`;
    
    try {
      const result = await this.bookingsSrv.checkIn(this.checkInBooking.id);
      console.log('[AdminBookings] checkIn response:', result);
      
      this.successMessage = 'Check-in thành công!';
      this.showCheckInModal = false;
      this.checkInBooking = null;
      
      await this.load();
      
      setTimeout(() => {
        this.successMessage = null;
      }, 5000);
    } catch (e: any) {
      const statusCode = e?.status || e?.error?.status || e?.error?.statusCode || null;
      const errMsg = e?.error?.message || e?.message || '';
      
      if (statusCode === 401 || /unauthor/i.test(String(errMsg))) {
        this.error = 'Bạn chưa đăng nhập. Vui lòng đăng nhập lại.';
        try { this.authState.setUser(null); } catch (_) {}
      } else if (statusCode === 403 || /forbidden/i.test(String(errMsg))) {
        this.error = 'Bạn không có quyền thực hiện check-in. Vui lòng liên hệ quản lý.';
      } else {
        this.error = errMsg || 'Check-in thất bại';
      }
    } finally { 
      this.checkingIn = false;
      this.pendingAction = null; 
    }
  }

  closeCheckInModal() {
    this.showCheckInModal = false;
    this.checkInBooking = null;
  }

  // ========== QR Scanner Methods ==========
  
  openQrScanner() {
    this.showQrScanner = true;
    this.qrScannerEnabled = true;
    this.qrScanError = null;
    this.qrScanSuccess = null;
  }

  closeQrScanner() {
    this.showQrScanner = false;
    this.qrScannerEnabled = false;
    this.qrScanError = null;
    this.qrScanSuccess = null;
  }

  onCamerasFound(cameras: MediaDeviceInfo[]) {
    this.availableCameras = cameras;
    if (cameras.length > 0) {
      // Ưu tiên camera sau (back camera) cho mobile
      const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear'));
      this.selectedCamera = backCamera ?? cameras[0];
    }
  }

  onScanSuccess(resultString: string) {
    console.log('[QR Scanner] Scanned:', resultString);
    this.qrScannerEnabled = false; // Tạm dừng scanner
    
    // Kiểm tra xem QR code có phải là mã đơn không
    this.processQrCode(resultString);
  }

  onScanError(error: any) {
    console.error('[QR Scanner] Error:', error);
    // Không hiển thị lỗi liên tục, chỉ log
  }

  async processQrCode(scannedCode: string) {
    this.qrScanError = null;
    this.qrScanSuccess = null;
    
    // Tìm booking với mã đơn trùng khớp
    const matchingBooking = this.bookings.find(b => {
      const bookingCode = b.code || b.id;
      // So sánh chính xác hoặc QR có chứa mã đơn
      return bookingCode === scannedCode || 
             scannedCode.includes(bookingCode) || 
             bookingCode.includes(scannedCode) ||
             b.id === scannedCode;
    });

    if (!matchingBooking) {
      this.qrScanError = 'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã QR.';
      // Cho phép quét lại sau 2 giây
      setTimeout(() => {
        this.qrScannerEnabled = true;
      }, 2000);
      return;
    }

    // Kiểm tra xem đơn có thể check-in không
    if (!this.canCheckIn(matchingBooking)) {
      const statusLabel = this.getStatusLabel(matchingBooking.statusNormalized || matchingBooking.status);
      this.qrScanError = `Đơn không thể check-in. Trạng thái hiện tại: ${statusLabel}`;
      setTimeout(() => {
        this.qrScannerEnabled = true;
      }, 2000);
      return;
    }

    // Tiến hành check-in
    this.qrScanSuccess = 'Đang xử lý check-in...';
    
    try {
      const result = await this.bookingsSrv.checkIn(matchingBooking.id);
      console.log('[QR Check-in] Success:', result);
      
      this.qrScanSuccess = '✅ Check-in thành công!';
      this.successMessage = 'Check-in thành công!';
      
      // Đóng scanner và reload sau 1.5 giây
      setTimeout(() => {
        this.closeQrScanner();
        this.load();
      }, 1500);
      
      setTimeout(() => {
        this.successMessage = null;
      }, 5000);
    } catch (e: any) {
      const statusCode = e?.status || e?.error?.statusCode || 0;
      let errMsg = e?.error?.message || e?.message || 'Check-in thất bại';
      
      // Xử lý lỗi 403 - Forbidden
      if (statusCode === 403 || errMsg.toLowerCase().includes('forbidden')) {
        errMsg = 'Bạn không có quyền thực hiện check-in. Vui lòng liên hệ quản lý.';
      }
      
      this.qrScanError = errMsg;
      
      // Cho phép quét lại
      setTimeout(() => {
        this.qrScannerEnabled = true;
      }, 2000);
    }
  }

  switchCamera() {
    if (this.availableCameras.length <= 1) return;
    
    const currentIndex = this.availableCameras.findIndex(c => c.deviceId === this.selectedCamera?.deviceId);
    const nextIndex = (currentIndex + 1) % this.availableCameras.length;
    this.selectedCamera = this.availableCameras[nextIndex];
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
    
    // Không cho check-in nếu đã check-in rồi
    if (normalized === 'CHECKED_IN') {
      return false;
    }
    
    // Không cho check-in nếu đã hủy
    if (normalized === 'CANCELLED' || normalized === 'EXPIRED') {
      return false;
    }
    
    // Cho phép check-in nếu đã thanh toán (COMPLETED) hoặc đã xác nhận (CONFIRMED)
    // Cũng cho phép nếu PENDING nhưng có thể thanh toán tiền mặt
    const allowedStatuses = ['COMPLETED', 'CONFIRMED'];
    const canCheckInByStatus = allowedStatuses.includes(normalized);
    
    // Log để debug
    console.log('🔍 canCheckIn debug:', { 
      bookingId: booking.id?.substring(0, 8), 
      normalized, 
      canCheckInByStatus,
      paymentStatus: this.getPaymentStatus(booking)
    });
    
    return canCheckInByStatus;
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

  /**
   * Lấy trạng thái thanh toán từ booking object
   */
  getPaymentStatus(booking: any): string {
    // Ưu tiên lấy từ payment object nếu có
    if (booking.payment?.status) {
      return booking.payment.status.toUpperCase();
    }
    
    // Fallback: suy luận từ trạng thái booking
    const bookingStatus = this.normalizeStatus(booking.status || booking.statusNormalized || '');
    
    if (bookingStatus === 'COMPLETED' || bookingStatus === 'CHECKED_IN') {
      return 'COMPLETED';
    } else if (bookingStatus === 'PENDING' || bookingStatus === 'PENDING_PAYMENT' || bookingStatus === 'CONFIRMED') {
      return 'PENDING';
    } else if (bookingStatus === 'CANCELLED') {
      return 'FAILED';
    }
    
    return '';
  }

  /**
   * Lấy nhãn hiển thị cho trạng thái thanh toán
   */
  getPaymentStatusLabel(booking: any): string {
    const status = this.getPaymentStatus(booking);
    const labelMap: Record<string, string> = {
      'COMPLETED': '✓ Đã thanh toán',
      'PENDING': '⏳ Chờ thanh toán',
      'FAILED': '✗ Thất bại',
    };
    return labelMap[status] || 'Chưa rõ';
  }

  /**
   * Suy luận trạng thái thanh toán từ trạng thái booking
   */
  private inferPaymentStatusFromBooking(bookingStatus: string): string {
    if (bookingStatus === 'COMPLETED' || bookingStatus === 'CHECKED_IN') {
      return 'completed';
    } else if (bookingStatus === 'PENDING' || bookingStatus === 'PENDING_PAYMENT' || bookingStatus === 'CONFIRMED') {
      return 'pending';
    } else if (bookingStatus === 'CANCELLED') {
      return 'failed';
    }
    return 'pending';
  }
}

