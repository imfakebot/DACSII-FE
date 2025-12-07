import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface VoucherCheckResponse {
  isValid: boolean;
  code: string;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class VoucherService {
  constructor(private http: HttpClient) {}

  async checkVoucher(code: string, orderValue: number): Promise<VoucherCheckResponse> {
    const params = new HttpParams()
      .set('code', code)
      .set('orderValue', String(orderValue));
    return firstValueFrom(
      this.http.get<VoucherCheckResponse>(`/voucher/check`, { params })
    );
  }
}
