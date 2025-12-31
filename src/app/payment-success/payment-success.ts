import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BookingsService } from '../services/bookings.service';
import { PaymentService } from '../services/payment.service';
import { formatVnpDate } from '../utils/date.util';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-success.html',
  styleUrls: ['./payment-success.scss']
})
export class PaymentSuccessComponent implements OnInit {
  bookingId: string | null = null;
  bookingDetails: any = null;
  loading = true;
  error: string | null = null;
  downloadingTicket = false;
  paymentVerified = false;
  vnpayParams: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingsService: BookingsService,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    // Get all query params from VNPay
    this.route.queryParams.subscribe(params => {
      this.vnpayParams = params;
      this.bookingId = params['vnp_TxnRef'] || params['bookingId'];
      
      console.log('[PaymentSuccess] Received query params:', params);
      console.log('[PaymentSuccess] Extracted booking ID:', this.bookingId);
      
      // Only process in browser (not during SSR)
      if (typeof window !== 'undefined' && this.bookingId) {
        this.verifyAndLoadBooking();
      } else if (!this.bookingId) {
        this.loading = false;
        this.error = 'Không tìm thấy mã đặt sân (vnp_TxnRef)';
        console.error('[PaymentSuccess] No booking ID found in params');
      } else {
        // SSR context - just set loading false
        this.loading = false;
      }
    });
  }

  /**
   * Verify payment with backend and load booking details
   */
  async verifyAndLoadBooking() {
    if (!this.bookingId || !this.vnpayParams) return;
    
    this.loading = true;
    this.error = null;

    try {
      // Step 1: Verify payment with backend
      console.log('[PaymentSuccess] Verifying payment with backend...');
      const verifyResult = await this.paymentService.verifyVnpayReturn(this.vnpayParams);
      
      console.log('[PaymentSuccess] Payment verification result:', verifyResult);
      
      if (!verifyResult.data.isSuccess) {
        this.error = verifyResult.data.message || 'Thanh toán không thành công';
        this.loading = false;
        return;
      }

      this.paymentVerified = true;

      // Step 2: Load booking details from /bookings/me endpoint
      // BE doesn't have /bookings/:id endpoint, so we need to fetch user's bookings and try several matching strategies
      console.log('[PaymentSuccess] Loading booking details from user bookings...');
      let myBookingsResponse;
      try {
        myBookingsResponse = await this.bookingsService.getMyBookings(1, 100);
        console.log('[PaymentSuccess] My bookings response:', myBookingsResponse);
      } catch (bookingErr: any) {
        console.error('[PaymentSuccess] Failed to fetch user bookings:', bookingErr);
        myBookingsResponse = { data: [] };
      }

      // Normalize response: backend returns { data, meta }, older code expected { items }
      const bookingsArray = myBookingsResponse?.data ?? myBookingsResponse?.items ?? [];

      // Build candidate refs from vnp params and bookingId
      const vnpRefRaw = String(this.vnpayParams?.['vnp_TxnRef'] || this.bookingId || '').toString();
      const vnpOrderInfo = String(this.vnpayParams?.['vnp_OrderInfo'] || '').toString();
      const candidateRefs = new Set<string>();
      if (vnpRefRaw) candidateRefs.add(vnpRefRaw);
      if (this.bookingId) candidateRefs.add(this.bookingId);
      if (vnpOrderInfo) {
        candidateRefs.add(vnpOrderInfo);
        // If OrderInfo contains an id-like token, also add cleaned alphanum version
        candidateRefs.add(vnpOrderInfo.replace(/[^a-zA-Z0-9]/g, ''));
      }

      // Also add the bookingId without hyphens if we have one
      if (this.bookingId) candidateRefs.add((this.bookingId || '').replace(/-/g, ''));

      const candidates = Array.from(candidateRefs).filter(Boolean);

      // Try to find booking in user's bookings by any candidate
      let booking: any = null;
      for (const b of bookingsArray) {
        if (!b) continue;
        const bid = String(b.id || '').toString();
        const bidNoHyphen = bid.replace(/-/g, '');
        const code = String(b.code || '').toString();
        for (const c of candidates) {
          if (!c) continue;
          if (bid === c || bidNoHyphen === c || code === c) {
            booking = b;
            console.log('[PaymentSuccess] Matched booking by candidate:', { candidate: c, bid, bidNoHyphen, code });
            break;
          }
        }
        if (booking) break;
      }

      // If booking not found in backend list, try local pendingBooking stored at booking time
      const vnpRef = String(this.vnpayParams?.['vnp_TxnRef'] || this.bookingId || '').toString();
      let pendingBooking: any = null;
      try {
        if (typeof window !== 'undefined') {
          const possibleKeys = [] as string[];
          if (vnpRef) possibleKeys.push(`pendingBooking_${vnpRef}`);
          if (this.bookingId) possibleKeys.push(`pendingBooking_${this.bookingId}`);
          if (this.bookingId) possibleKeys.push(`pendingBooking_${(this.bookingId || '').replace(/-/g, '')}`);
          // Also try orderInfo cleaned
          if (vnpOrderInfo) possibleKeys.push(`pendingBooking_${vnpOrderInfo}`);
          possibleKeys.forEach(k => {
            if (!pendingBooking) {
              const raw = localStorage.getItem(k);
              if (raw) {
                try { pendingBooking = JSON.parse(raw); } catch (e) { pendingBooking = null; }
              }
            }
          });
        }
      } catch (e) {
        pendingBooking = null;
      }

      if (!booking && pendingBooking) {
        console.log('[PaymentSuccess] Using pendingBooking from localStorage as booking fallback', pendingBooking);
        booking = pendingBooking;
      }

      if (!booking) {
        // If booking still not found, create minimal details from VNPAY response
        console.warn('[PaymentSuccess] Booking not found in user bookings or pending storage, using VNPAY data only');
        const currentDate = new Date();
        const payDate = this.vnpayParams['vnp_PayDate'];
        let displayDate = currentDate;

        // Parse VNPAY date if available (format: yyyyMMddHHmmss)
        if (payDate && payDate.length === 14) {
          try {
            const year = parseInt(payDate.substring(0, 4));
            const month = parseInt(payDate.substring(4, 6)) - 1;
            const day = parseInt(payDate.substring(6, 8));
            const hour = parseInt(payDate.substring(8, 10));
            const minute = parseInt(payDate.substring(10, 12));
            const second = parseInt(payDate.substring(12, 14));
            displayDate = new Date(year, month, day, hour, minute, second);
          } catch (e) {
            console.warn('[PaymentSuccess] Failed to parse VNPAY date:', e);
          }
        }

        this.bookingDetails = {
          id: this.bookingId,
          code: this.vnpayParams['vnp_TxnRef'] || this.bookingId,
          fieldName: 'Đang cập nhật...',
          fieldType: 'Sân thể thao',
          customerName: 'Vui lòng kiểm tra trong "Lịch sử đặt sân"',
          startTime: displayDate.toISOString(),
          endTime: displayDate.toISOString(),
          startTimeVnp: formatVnpDate(displayDate.toISOString()),
          endTimeVnp: formatVnpDate(displayDate.toISOString()),
          duration: 0,
          totalAmount: verifyResult.data.amount || 0,
          status: 'COMPLETED',
          paymentStatus: 'completed',
          location: 'Hệ thống sân bóng Hai Anh Em',
          address: 'Chi tiết sẽ được cập nhật trong lịch sử đặt sân',
          qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(this.bookingId)
        };
        this.loading = false;
        console.log('[PaymentSuccess] Using fallback booking details');
        return;
      }

      // Attempt to read any pending booking stored locally (created just before redirect to payment)
      // Reuse previously-read `pendingBooking` (if any) to avoid redeclaration
      if (typeof pendingBooking === 'undefined' || pendingBooking === null) {
        try {
          if (typeof window !== 'undefined') {
            const k1 = `pendingBooking_${vnpRef}`;
            const k2 = `pendingBooking_${booking.id}`;
            const raw = localStorage.getItem(k1) || localStorage.getItem(k2) || null;
            if (raw) pendingBooking = JSON.parse(raw);
            else pendingBooking = null;
          }
        } catch (e) {
          pendingBooking = null;
        }
      }

      // Prefer account name if backend included it, then userProfile.full_name, then customerName, then pending booking
      const customerName = (
        booking?.userProfile?.account?.userProfile?.full_name ||
        booking?.userProfile?.full_name ||
        booking?.customerName ||
        pendingBooking?.userProfile?.account?.userProfile?.full_name ||
        pendingBooking?.userProfile?.full_name ||
        pendingBooking?.customerName ||
        'Khách hàng'
      );

      // Map backend booking to display format
      this.bookingDetails = {
        id: booking.id,
        code: booking.code,
        fieldName: booking.field?.name || 'Sân bóng',
        fieldType: booking.field?.fieldType?.name || 'Bóng đá',
        customerName: customerName,
        startTime: booking.start_time,
        endTime: booking.end_time,
        startTimeVnp: formatVnpDate(booking.start_time),
        endTimeVnp: formatVnpDate(booking.end_time),
        duration: Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000),
        totalAmount: verifyResult.data.amount || booking.total_price,
        status: booking.status,
        paymentStatus: 'completed',
        location: booking.field?.branch?.name || 'Hệ thống sân bóng',
        address: booking.field?.branch?.address ? 
          `${booking.field.branch.address.street}, ${booking.field.branch.address.ward?.name || ''}, ${booking.field.branch.address.city?.name || ''}` : '',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(this.bookingId)
      };
      
      this.loading = false;
      console.log('[PaymentSuccess] Booking loaded successfully:', this.bookingDetails);
            this.loading = false;
            try {
              // cleanup pending entries
              if (typeof window !== 'undefined') {
                const k1 = `pendingBooking_${vnpRef}`;
                const k2 = `pendingBooking_${booking.id}`;
                try { localStorage.removeItem(k1); } catch (_) {}
                try { localStorage.removeItem(k2); } catch (_) {}
              }
            } catch (_) {}
    } catch (err: any) {
      console.error('[PaymentSuccess] Failed to verify/load booking:', err);
      this.error = err?.message || 'Không thể xác thực thanh toán';
      this.loading = false;
    }
  }

  async loadBookingDetails(vnpayParams?: any) {
    // DEPRECATED - kept for backward compatibility
    // Use verifyAndLoadBooking() instead
    console.warn('[PaymentSuccess] loadBookingDetails is deprecated, use verifyAndLoadBooking');
    await this.verifyAndLoadBooking();
  }

  /**
   * Download ticket as PDF from backend
   */
  async downloadTicket() {
    if (!this.bookingDetails) {
      alert('Không tìm thấy thông tin đặt sân');
      return;
    }
    
    this.downloadingTicket = true;

    try {
      // Get booking ID
      const bookingId = this.bookingDetails.id || this.bookingId;
      if (!bookingId) {
        throw new Error('Không tìm thấy mã đặt sân');
      }

      console.log('[PaymentSuccess] Downloading ticket for booking:', bookingId);
      
      // Call backend to get PDF
      const pdfBlob = await this.bookingsService.downloadTicket(bookingId);
      
      console.log('[PaymentSuccess] PDF blob received, size:', pdfBlob.size);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ve-Dat-San-${bookingId.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('[PaymentSuccess] PDF downloaded successfully');
      alert('Vé đã được tải xuống!');
    } catch (err: any) {
      console.error('[PaymentSuccess] Failed to download ticket:', err);
      const errorMsg = err?.message || 'Không thể tải vé';
      alert(`Lỗi: ${errorMsg}. Vui lòng thử lại hoặc liên hệ hỗ trợ.`);
    } finally {
      this.downloadingTicket = false;
    }
  }

  /**
   * Generate ticket text content
   */
  private generateTicketText(): string {
    const booking = this.bookingDetails;
    return `
═══════════════════════════════════════════════
           VÉ ĐẶT SÂN - HAI ANH EM
═══════════════════════════════════════════════

            console.warn('[PaymentSuccess] Booking not found in user bookings, trying localStorage pending booking');
Mã đặt chỗ: ${booking.id}
Trạng thái: ĐÃ THANH TOÁN

───────────────────────────────────────────────
THÔNG TIN SÂN
───────────────────────────────────────────────
Tên sân:     ${booking.fieldName}
Loại sân:    ${booking.fieldType}
Địa điểm:    ${booking.location}

───────────────────────────────────────────────
THÔNG TIN ĐẶT CHỖ
───────────────────────────────────────────────
Khách hàng:  ${booking.customerName}
Thời gian:   ${this.formatDateTime(booking.startTime)}
Thời lượng:  ${booking.duration} phút
Kết thúc:    ${this.formatDateTime(booking.endTime)}

───────────────────────────────────────────────
THANH TOÁN
───────────────────────────────────────────────
Tổng tiền:   ${this.formatCurrency(booking.totalAmount)}
Trạng thái:  ĐÃ THANH TOÁN

───────────────────────────────────────────────
LƯU Ý
───────────────────────────────────────────────
• Vui lòng đến trước giờ bắt đầu 15 phút
• Mang theo vé này để check-in tại quầy
• Liên hệ hotline: 1900-xxxx nếu cần hỗ trợ

Cảm ơn bạn đã sử dụng dịch vụ!
═══════════════════════════════════════════════
    `;
  }

  /**
   * Format datetime
   */
  formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Go back to home
   */
  goHome() {
    this.router.navigate(['/']);
  }

  /**
   * View my bookings
   */
  viewMyBookings() {
    this.router.navigate(['/bookings']);
  }

  /**
   * Print ticket
   */
  printTicket() {
    window.print();
  }
}
