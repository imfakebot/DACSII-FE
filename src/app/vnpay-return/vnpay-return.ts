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
  ) { }

  async ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      const responseCode = params['vnp_ResponseCode'];
      const transactionStatus = params['vnp_TransactionStatus'];
      const bookingId = params['vnp_TxnRef']; // Lấy mã đơn hàng từ VNPAY

      console.log('[VNPay Return] Đã nhận tín hiệu. Response Code:', responseCode);

      // KHÔNG GỌI BACKEND XÁC THỰC NỮA! (Backend đã tự xử lý qua IPN rồi)
      // Chỉ kiểm tra mã 00 trên URL để chuyển hướng giao diện thôi.

      if (responseCode === '00' || transactionStatus === '00') {
        console.log('[VNPay Return] Thanh toán thành công, đang chuyển qua trang Success...');

        // Đá thẳng qua trang thành công kèm theo cái ID
        this.router.navigate(['/payment-success'], {
          queryParams: { bookingId }
        });
      } else {
        // Khách hủy giao dịch hoặc thẻ hết tiền
        alert('Thanh toán không thành công hoặc đã bị hủy. Vui lòng thử lại.');
        this.router.navigate(['/']); // Đá về trang chủ hoặc trang đặt sân
      }
    });
  }
}
