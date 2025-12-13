import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VoucherAdminService {
  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async getAll(): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`/voucher`, this.authHeaders()));
  }

  async getById(id: string): Promise<any> {
    return firstValueFrom(this.http.get<any>(`/voucher/${id}`, this.authHeaders()));
  }

  async create(payload: any): Promise<any> {
    return firstValueFrom(this.http.post(`/voucher`, payload, this.authHeaders()));
  }

  async remove(id: string): Promise<{ message: string }> {
    return firstValueFrom(this.http.delete<{ message: string }>(`/voucher/${id}`, this.authHeaders()));
  }
}
