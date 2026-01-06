import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

@Injectable({ providedIn: 'root' })
export class VoucherAdminService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService) {}

  private authHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async getAll(): Promise<any[]> {
    // Backend không có GET /voucher endpoint cho admin
    // Workaround: Dùng GET /voucher/available với orderValue rất lớn để lấy tất cả
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl.getApiBaseUrl()}/voucher/available?orderValue=999999999`, this.authHeaders()));
  }

  async getById(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`${this.baseUrl.getApiBaseUrl()}/voucher/${id}`, this.authHeaders()));
  }

  async create(payload: any): Promise<any> {
    return firstValueFrom(this.http.post(`${this.baseUrl.getApiBaseUrl()}/voucher`, payload, this.authHeaders()));
  }

  async remove(id: string): Promise<{ message: string }> {
    return firstValueFrom(this.http.delete<{ message: string }>(`${this.baseUrl.getApiBaseUrl()}/voucher/${id}`, this.authHeaders()));
  }
}
