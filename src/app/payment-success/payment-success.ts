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
      
      // Only process in browser (not during SSR)
      if (typeof window !== 'undefined' && this.bookingId) {
        this.verifyAndLoadBooking();
      } else if (!this.bookingId) {
        this.loading = false;
        this.error = 'Không tìm thấy thông tin booking';
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

      // Step 2: Load booking details from backend
      console.log('[PaymentSuccess] Loading booking details...');
      const booking = await this.bookingsService.getBookingById(this.bookingId);
      
      if (!booking) {
        this.error = 'Không tìm thấy thông tin booking';
        this.loading = false;
        return;
      }

      // Map backend booking to display format
      this.bookingDetails = {
        id: booking.id,
        code: booking.code,
        fieldName: booking.field?.name || 'Sân bóng',
        fieldType: booking.field?.fieldType || 'Bóng đá',
        customerName: booking.userProfile?.full_name || 'Khách hàng',
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
   * Download ticket as PDF (mock implementation)
   */
  async downloadTicket() {
    if (!this.bookingDetails) return;
    
    this.downloadingTicket = true;

    try {
      // Mock download delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, this would call backend API to generate PDF
      // For now, we'll create a simple text receipt
      const ticketContent = this.generateTicketText();
      const blob = new Blob([ticketContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ticket_${this.bookingId}.txt`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      alert('Vé đã được tải xuống!');
    } catch (err) {
      console.error('[PaymentSuccess] Failed to download ticket:', err);
      alert('Không thể tải vé. Vui lòng thử lại.');
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
