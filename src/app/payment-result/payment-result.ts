import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-result.html',
  styleUrl: './payment-result.scss'
})
export class PaymentResultComponent implements OnInit {
  loading = true;
  paymentData: any = null;
  error: string | null = null;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    console.log('[PaymentResult] Constructor called - Component loaded');
  }

  ngOnInit() {
    console.log('[PaymentResult] ngOnInit called');
    
    // Check if running in browser (not SSR)
    if (typeof window === 'undefined') {
      console.log('[PaymentResult] Running in SSR mode');
      this.error = 'Đang tải...';
      this.loading = false;
      return;
    }

    // Get current URL with all query params
    const currentUrl = window.location.href;
    console.log('[PaymentResult] Current URL:', currentUrl);

    // Check if we're on backend URL (port 3000) - redirect to frontend
    if (currentUrl.includes('localhost:3000') || currentUrl.includes(':3000')) {
      console.log('[PaymentResult] Detected backend URL, redirecting to frontend...');
      // Replace port 3000 with 4200
      const frontendUrl = currentUrl.replace(':3000', ':4200');
      window.location.href = frontendUrl;
      return;
    }

    // Extract query params from URL
    const url = new URL(currentUrl);
    const queryParams: any = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    console.log('[PaymentResult] Query params:', queryParams);

    // Check if we have VNPay params
    if (queryParams['vnp_ResponseCode']) {
      console.log('[PaymentResult] Found VNPay params, verifying...');
      this.verifyPayment(queryParams);
    } else {
      console.log('[PaymentResult] No VNPay params found');
      this.error = 'Không tìm thấy thông tin thanh toán';
      this.loading = false;
    }
  }

  verifyPayment(params: any) {
    // Use HttpClient to call backend via proxy (avoids CORS issues)
    // Note: Backend returns 400 for failed payments, so we need to handle both success and error responses
    this.http.get<any>('/payment/vnpay_return', { params }).subscribe({
      next: (data) => {
        console.log('[PaymentResult] Backend success response:', data);
        this.handlePaymentResponse(data, params);
      },
      error: (err) => {
        console.log('[PaymentResult] Backend error response:', err);
        
        // Backend returns 400 for failed payments, extract the response body
        if (err.error && typeof err.error === 'object') {
          console.log('[PaymentResult] Error contains response data:', err.error);
          this.handlePaymentResponse(err.error, params);
        } else {
          console.error('[PaymentResult] Unexpected error:', err);
          this.error = 'Không thể xác thực thanh toán';
          this.loading = false;
        }
      }
    });
  }

  handlePaymentResponse(data: any, params: any) {
    this.paymentData = {
      success: data.data?.isSuccess === true, // Explicit check for true
      message: data.message || data.data?.message || '',
      orderId: data.data?.orderId || params['vnp_TxnRef'],
      amount: data.data?.amount || 0,
      responseCode: data.data?.rspCode || params['vnp_ResponseCode'],
      transactionNo: params['vnp_TransactionNo'],
      bankCode: params['vnp_BankCode'],
      payDate: params['vnp_PayDate']
    };

    console.log('[PaymentResult] Final payment data:', this.paymentData);
    this.loading = false;
  }

  goToMyBookings() {
    this.router.navigate(['/bookings']);
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  formatDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 14) return dateStr;
    // Format: YYYYMMDDHHmmss -> DD/MM/YYYY HH:mm:ss
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);
    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  }
}
