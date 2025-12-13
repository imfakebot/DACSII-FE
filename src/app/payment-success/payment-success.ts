import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { BookingsService } from '../services/bookings.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingsService: BookingsService
  ) {}

  ngOnInit() {
    // Get booking ID from query params (returned from VNPay)
    this.route.queryParams.subscribe(params => {
      this.bookingId = params['bookingId'] || params['vnp_TxnRef'];
      
      // Only load booking details in browser (not during SSR)
      if (this.bookingId && typeof window !== 'undefined') {
        this.loadBookingDetails(params);
      } else if (!this.bookingId) {
        this.loading = false;
        this.error = 'Không tìm thấy thông tin booking';
      } else {
        // SSR context - just set loading false
        this.loading = false;
      }
    });
  }

  async loadBookingDetails(vnpayParams?: any) {
    if (!this.bookingId) return;
    
    this.loading = true;
    this.error = null;

    try {
      // Use mock data but with real payment amount from VNPay
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
      
      // Get amount from VNPay params (vnp_Amount is in VND * 100)
      const vnpAmount = vnpayParams?.['vnp_Amount'] || 0;
      const actualAmount = parseInt(vnpAmount) / 100;
      
      this.bookingDetails = {
        id: this.bookingId,
        fieldName: 'Sân bóng đá',
        fieldType: 'Bóng đá',
        customerName: 'Khách hàng',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        duration: 90,
        totalAmount: actualAmount, // Use real amount from VNPay
        status: 'completed',
        paymentStatus: 'completed',
        location: 'Hệ thống sân bóng',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(this.bookingId)
      };
      
      this.loading = false;
    } catch (err: any) {
      console.error('[PaymentSuccess] Failed to load booking:', err);
      this.error = err?.error?.message || err?.message || 'Không thể tải thông tin booking';
      this.loading = false;
    }
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
