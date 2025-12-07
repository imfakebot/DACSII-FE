import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CreateBookingDto {
  fieldId: string;
  startTime: string; // ISO 8601
  durationMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class BookingsService {
  constructor(private http: HttpClient) {}

  private authHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('accessToken') || '';
    console.log('[BookingsService] Getting auth headers, token exists:', !!token);
    if (!token) {
      console.warn('[BookingsService] No access token found in localStorage');
    }
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async create(payload: CreateBookingDto): Promise<any> {
    // Lightweight retry logic for transient errors (e.g., 5xx or network failures)
    const maxAttempts = 3;
    const retryDelay = (attempt: number) => 500 * Math.pow(2, attempt - 1); // 500ms, 1000ms

    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const res = await firstValueFrom(this.http.post(`/bookings`, payload, this.authHeaders()));
        return res;
      } catch (err: any) {
        // If it's an HttpErrorResponse-like object, inspect status
        const status = err?.status;
        const isServerError = status >= 500 || status === 0 || status === undefined;
        // Do not retry for 4xx client validation errors
        if (!isServerError || attempt >= maxAttempts) {
          // Normalize error object so callers can show useful debug info
          const normalized = {
            status: status ?? 0,
            message: err?.error?.message || err?.message || 'Unknown error',
            body: err?.error ?? null,
            raw: err,
          };
          throw normalized;
        }

        // transient server error => wait and retry
        await new Promise((r) => setTimeout(r, retryDelay(attempt)));
        continue;
      }
    }
  }

  async cancel(bookingId: string): Promise<{ message: string }> {
    return firstValueFrom(this.http.patch<{ message: string }>(`/bookings/${bookingId}/cancel`, {}, this.authHeaders()));
  }

  async getMyBookings(page = 1, limit = 10, filters?: Record<string, any>): Promise<any> {
    // Accepts optional filters object which will be appended as query params
    let params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filters) {
      Object.keys(filters).forEach((k) => {
        if (filters[k] !== undefined && filters[k] !== null) params.set(k, String(filters[k]));
      });
    }
    const url = `/bookings/me?${params.toString()}`;
    return firstValueFrom(this.http.get<any>(url, this.authHeaders()));
  }

  // Admin: get all bookings with pagination and optional status filter
  async getAdminBookings(page = 1, limit = 10, status?: string): Promise<any> {
    // Backend exposes admin booking list at /bookings/management/all
    let q = `/bookings/management/all?page=${page}&limit=${limit}`;
    if (status) q += `&status=${encodeURIComponent(status)}`;
    return firstValueFrom(this.http.get<any>(q, this.authHeaders()));
  }

  /**
   * Lấy lịch đặt sân cho một sân trong một ngày cụ thể
   * @param fieldId ID của sân
   * @param date Ngày cần xem lịch (format: YYYY-MM-DD)
   * @returns Danh sách các booking trong ngày với thông tin startTime, endTime, status
   */
  async getFieldSchedule(fieldId: string, date: string): Promise<any> {
    const url = `/bookings/field/${fieldId}/schedule?date=${date}`;
    return firstValueFrom(this.http.get<any>(url, this.authHeaders()));
  }

  /**
   * Check-in cho khách hàng tại sân (Manager/Admin only)
   * @param bookingId ID của booking cần check-in
   */
  async checkIn(bookingId: string): Promise<any> {
    return firstValueFrom(this.http.post<any>(`/bookings/check-in`, { bookingId }, this.authHeaders()));
  }

  /**
   * Tạo booking tại quầy (Admin/Staff only)
   * @param payload Thông tin booking
   */
  async createBookingByAdmin(payload: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`/bookings/management/create`, payload, this.authHeaders()));
  }
}
