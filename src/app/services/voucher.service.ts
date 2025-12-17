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

export interface Voucher {
  id: string;
  code: string;
  discountAmount: number | null;
  discountPercentage: number | null;
  maxDiscountAmount: number | null;
  minOrderValue: number;
  validFrom: Date;
  validTo: Date;
  quantity: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
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

  async getAvailableVouchers(orderValue: number): Promise<Voucher[]> {
    const params = new HttpParams()
      .set('orderValue', String(orderValue));
    return firstValueFrom(
      this.http.get<Voucher[]>(`/voucher/available`, { params })
    );
  }
}
