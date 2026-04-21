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
  ) { }

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
    if (!this.bookingId) return;

    this.loading = true;
    this.error = null;

    try {
      // BƯỚC 1: KHÔNG VERIFY THANH TOÁN NỮA!
      // VNPAY đã gọi IPN ngầm cho Backend rồi. Khách bị đá về đây là mặc định Backend đã xử lý xong.
      console.log('[PaymentSuccess] Payment handled by Backend via IPN. Fetching booking details...');
      this.paymentVerified = true;

      // BƯỚC 2: GỌI THẲNG API LẤY THÔNG TIN ĐƠN HÀNG (Dựa vào bookingId trên URL)
      // Chú ý: Backend PHẢI CÓ một API kiểu `GET /api/bookings/{id}`. 
      // Nếu chưa có, bắt đệ Backend viết ngay 1 cái API này (cực dễ).

      let bookingDetails: any = null;
      try {
        // Giả sử Backend có API: GET /api/bookings/{id}
        // Sếp thay bằng cái hàm gọi API tương ứng trong BookingService của Frontend nhé.
        // Ví dụ: const response = await this.bookingsService.getBookingById(this.bookingId);

        // --- ĐOẠN NÀY LÀ VÍ DỤ NẾU Backend chưa có API GET theo ID (Phải đi vòng qua list) ---
        const myBookingsResponse = await this.bookingsService.getMyBookings(1, 100);
        const bookingsArray = myBookingsResponse?.data ?? myBookingsResponse?.items ?? [];

        // Tìm đúng cái Booking theo ID
        bookingDetails = bookingsArray.find((b: { id: any; code: any; }) => String(b.id) === String(this.bookingId) || String(b.code) === String(this.bookingId));
        // ------------------------------------------------------------------------------------

      } catch (err) {
        console.error('[PaymentSuccess] Failed to fetch booking details:', err);
      }

      // BƯỚC 3: HIỂN THỊ LÊN MÀN HÌNH
      if (bookingDetails) {
        // Lấy tên khách hàng
        const customerName = (
          bookingDetails?.userProfile?.account?.userProfile?.full_name ||
          bookingDetails?.userProfile?.full_name ||
          bookingDetails?.customerName ||
          'Khách hàng'
        );

        this.bookingDetails = {
          id: bookingDetails.id,
          code: bookingDetails.code,
          fieldName: bookingDetails.field?.name || 'Sân bóng',
          fieldType: bookingDetails.field?.fieldType?.name || 'Bóng đá',
          customerName: customerName,
          startTime: bookingDetails.start_time,
          endTime: bookingDetails.end_time,
          duration: Math.round((new Date(bookingDetails.end_time).getTime() - new Date(bookingDetails.start_time).getTime()) / 60000),
          totalAmount: bookingDetails.total_price,
          status: bookingDetails.status, // Lúc này Backend update IPN xong thì status sẽ là COMPLETED
          paymentStatus: 'completed',
          location: bookingDetails.field?.branch?.address?.street || 'Hệ thống sân bóng',
          address: bookingDetails.field?.branch?.address ?
            `${bookingDetails.field.branch.address.street}, ${bookingDetails.field.branch.address.ward?.name || ''}, ${bookingDetails.field.branch.address.city?.name || ''}` : '',
          qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(this.bookingId)
        };
      } else {
        // NẾU KHÔNG TÌM THẤY (Do mạng chậm, IPN Backend chưa kịp update...)
        // Thì cứ show một cái thông báo cơ bản, vì tiền đã trừ rồi.
        this.bookingDetails = {
          id: this.bookingId,
          code: this.bookingId,
          fieldName: 'Đang cập nhật...',
          customerName: 'Vui lòng kiểm tra trong "Lịch sử đặt sân"',
          totalAmount: 'Đã thanh toán',
          status: 'COMPLETED',
          paymentStatus: 'completed',
          location: 'Hệ thống sân bóng',
          qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(this.bookingId)
        };
      }

      this.loading = false;

      // Xóa rác LocalStorage (Giữ lại đoạn này của ông đệ)
      try {
        if (typeof window !== 'undefined') {
          const possibleKeys = Object.keys(localStorage).filter(k => k.startsWith('pendingBooking_'));
          possibleKeys.forEach(k => localStorage.removeItem(k));
        }
      } catch (_) { }

    } catch (err: any) {
      console.error('[PaymentSuccess] Lỗi hiển thị:', err);
      this.error = 'Có lỗi xảy ra khi hiển thị thông tin. Vui lòng kiểm tra lịch sử đặt sân.';
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
