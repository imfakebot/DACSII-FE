import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BookingManagementService {
  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async createByAdmin(payload: any): Promise<any> {
    return firstValueFrom(this.http.post(`/bookings/management/create`, payload, this.authHeaders()));
  }

  async checkIn(bookingId: string): Promise<any> {
    // Backend expects { identifier: string }
    return firstValueFrom(this.http.post(`/bookings/check-in`, { identifier: bookingId }, this.authHeaders()));
  }

  async getAll(page = 1, limit = 10, status?: string): Promise<any> {
    let q = `/bookings/management/all?page=${page}&limit=${limit}`;
    if (status) q += `&status=${encodeURIComponent(status)}`;
    return firstValueFrom(this.http.get<any>(q, this.authHeaders()));
  }
}
