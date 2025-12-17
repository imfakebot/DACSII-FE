import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CreatePaymentUrlResponse { url: string }

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private http: HttpClient) {}

  private authHeaders(): { headers: HttpHeaders } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async createPaymentUrl(bookingId: string): Promise<CreatePaymentUrlResponse> {
    return firstValueFrom(this.http.post<CreatePaymentUrlResponse>(`/payment/create_payment_url`, { bookingId }, this.authHeaders()));
  }

  /**
   * Verify payment result từ VNPAY return URL
   * @param queryParams - Query parameters từ VNPAY callback
   */
  async verifyVnpayReturn(queryParams: Record<string, any>): Promise<any> {
    const params = new HttpParams({ fromObject: queryParams });
    const url = `/payment/vnpay_return`;
    console.log('[PaymentService] Verifying VNPAY return with params:', queryParams);

    try {
      const res = await firstValueFrom(
        this.http.get<any>(url, { params })
      );
      console.log('[PaymentService] VNPAY verification result:', res);
      return res;
    } catch (err: any) {
      console.error('[PaymentService] VNPAY verification failed:', err);
      throw {
        status: err?.status ?? 0,
        message: err?.error?.message || err?.message || 'Lỗi xác thực thanh toán',
        error: err?.error ?? null,
      };
    }
  }

  // Admin endpoints
  // Backend exposes stats at /payment/stats/overview
  async getAdminStats(startDate?: string, endDate?: string, branchId?: string): Promise<any> {
    const params = new HttpParams()
      .set('startDate', startDate ?? '')
      .set('endDate', endDate ?? '')
      .set('branchId', branchId ?? '');
    return firstValueFrom(this.http.get<any>(`/payment/stats/overview`, { params, ...this.authHeaders() }));
  }

  // Backend exposes revenue chart at /payment/chart
  async getRevenueChart(year?: number, branchId?: string): Promise<any> {
    const params = new HttpParams()
      .set('year', String(year ?? new Date().getFullYear()))
      .set('branchId', branchId ?? '');
    return firstValueFrom(this.http.get<any>(`/payment/chart`, { params, ...this.authHeaders() }));
  }
}
