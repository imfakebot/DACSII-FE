import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { formatVnpDate } from '../utils/date.util';
import { PaymentService } from '../services/payment.service';

@Component({
  selector: 'app-vnpay-return',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="text-align: center; color: white;">
        <div style="width: 60px; height: 60px; border: 4px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
        <p style="font-size: 1.125rem;">Đang xác nhận thanh toán...</p>
      </div>
    </div>
  `,
  styles: [`
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class VnpayReturnComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService
  ) {}

  async ngOnInit() {
    // Get VNPay return params
    this.route.queryParams.subscribe(async params => {
      const responseCode = params['vnp_ResponseCode'];
      const transactionStatus = params['vnp_TransactionStatus'];
      const bookingId = params['vnp_TxnRef'];

      console.log('[VNPay Return] Response Code:', responseCode);
      console.log('[VNPay Return] Transaction Status:', transactionStatus);
      console.log('[VNPay Return] Booking ID:', bookingId);
        if (params['vnp_PayDate']) {
          try {
            console.log('[VNPay Return] Pay Date (VNPay format):', params['vnp_PayDate']);
            console.log('[VNPay Return] Pay Date (formatted):', formatVnpDate(params['vnp_PayDate']));
          } catch {};
        }

      // Check if payment successful (VNPay returns 00 for success)
      if (responseCode === '00' || transactionStatus === '00') {
        try {
          // Call backend to verify payment and update booking status
          console.log('[VNPay Return] Calling backend to verify payment...');
          await this.paymentService.verifyVnpayReturn(params);
          console.log('[VNPay Return] Payment verified successfully, booking status updated');
          
          // Redirect to success page
          this.router.navigate(['/payment-success'], {
            queryParams: { bookingId }
          });
        } catch (error: any) {
          console.error('[VNPay Return] Payment verification failed:', error);
          alert('Xác thực thanh toán thất bại. Vui lòng liên hệ hỗ trợ.');
          this.router.navigate(['/']);
        }
      } else {
        // Redirect to failure page (or back to booking with error)
        alert('Thanh toán không thành công. Vui lòng thử lại.');
        this.router.navigate(['/']);
      }
    });
  }
}
