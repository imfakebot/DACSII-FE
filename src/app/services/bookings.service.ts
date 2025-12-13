import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CreateBookingDto {
  fieldId: string;
  startTime: string; // ISO 8601
  durationMinutes: number;
  voucherCode?: string;
}

export interface BookingResponse {
  message: string;
  paymentUrl: string;
  finalAmount: number;
  booking: {
    id: string;
    code: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: string;
  };
}

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private isBrowser: boolean;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private authHeaders(): { headers: HttpHeaders } {
    // SSR safety check
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.warn('[BookingsService] Running in SSR context, no localStorage available');
      return { headers: new HttpHeaders() };
    }
    
    const token = localStorage.getItem('accessToken') || '';
    console.log('[BookingsService] Getting auth headers, token exists:', !!token);
    if (!token) {
      console.warn('[BookingsService] No access token found in localStorage');
    }
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async create(payload: CreateBookingDto): Promise<BookingResponse> {
    console.log('[BookingsService] Creating booking with payload:', payload);
    try {
      const res = await firstValueFrom(
        this.http.post<BookingResponse>(`/bookings`, payload, this.authHeaders())
      );
      console.log('[BookingsService] Booking created successfully:', res);
      return res;
    } catch (err: any) {
      console.error('[BookingsService] Error creating booking:', err);
      // Rethrow with normalized structure
      throw {
        status: err?.status ?? 0,
        message: err?.error?.message || err?.message || 'Unknown error',
        error: err?.error ?? null,
      };
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
    // If running on server (SSR), avoid calling backend without credentials/proxy.
    // Return empty page so server rendering doesn't attempt an unauthorized API call.
    if (!this.isBrowser) {
      console.warn('[BookingsService] SSR detected - skipping getMyBookings network call');
      return Promise.resolve({ items: [], page, limit, total: 0 });
    }
    return firstValueFrom(this.http.get<any>(url, this.authHeaders()));
  }

  async getBookingById(bookingId: string): Promise<any> {
    if (!this.isBrowser) {
      console.warn('[BookingsService] SSR detected - skipping getBookingById network call');
      return Promise.resolve(null);
    }
    return firstValueFrom(this.http.get<any>(`/bookings/${bookingId}`, this.authHeaders()));
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
