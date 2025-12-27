import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

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

  constructor(
    private http: HttpClient, 
    @Inject(PLATFORM_ID) private platformId: Object,
    private baseUrl: BaseUrlService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private authHeaders(): { headers: HttpHeaders } {
    // SSR safety check
    if (!this.isBrowser) {
      // Running on server (SSR) - do not attempt to access localStorage or log warnings
      // Use debug-level log for diagnostics when needed
      if (console && (console as any).debug) (console as any).debug('[BookingsService] SSR context detected - skipping localStorage access');
      return { headers: new HttpHeaders() };
    }

    let token = '';
    try {
      token = localStorage.getItem('accessToken') || '';
      if (console && (console as any).debug) (console as any).debug('[BookingsService] Getting auth headers, token exists:', !!token);
      if (!token && console && (console as any).debug) (console as any).debug('[BookingsService] No access token found in localStorage');
    } catch (e) {
      // localStorage may throw in restrictive browsers; fall back to empty token
      token = '';
    }

    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async create(payload: CreateBookingDto): Promise<BookingResponse> {
    console.log('[BookingsService] Creating booking with payload:', payload);
    try {
      const res = await firstValueFrom(
        this.http.post<BookingResponse>(`${this.baseUrl.getApiBaseUrl()}/bookings`, payload, this.authHeaders())
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
    return firstValueFrom(this.http.patch<{ message: string }>(`${this.baseUrl.getApiBaseUrl()}/bookings/${bookingId}/cancel`, {}, this.authHeaders()));
  }

  async getMyBookings(page = 1, limit = 10, filters?: Record<string, any>): Promise<any> {
    // Accepts optional filters object which will be appended as query params
    console.log('[BookingsService] getMyBookings called with:', { page, limit, filters });
    let params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filters) {
      Object.keys(filters).forEach((k) => {
        const val = filters[k];
        // Only add non-empty values to avoid malformed URLs
        if (val !== undefined && val !== null && val !== '') {
          params.set(k, String(val));
        }
      });
    }
    const url = `${this.baseUrl.getApiBaseUrl()}/bookings/me?${params.toString()}`;
    console.log('[BookingsService] Constructed URL:', url);
    
    // Debug: log auth token
    if (this.isBrowser) {
      const token = localStorage.getItem('accessToken');
      const user = localStorage.getItem('authUser');
      console.log('[BookingsService] Has token:', !!token);
      console.log('[BookingsService] Token preview:', token ? token.substring(0, 20) + '...' : 'none');
      console.log('[BookingsService] User from storage:', user ? JSON.parse(user) : null);
    }
    
    // If running on server (SSR), avoid calling backend without credentials/proxy.
    // Return empty page so server rendering doesn't attempt an unauthorized API call.
    if (!this.isBrowser) {
      console.warn('[BookingsService] SSR detected - skipping getMyBookings network call');
      return Promise.resolve({ items: [], page, limit, total: 0 });
    }
    // Client-side safety: ensure we have a valid auth token and user id before calling endpoint.
    try {
      const token = localStorage.getItem('accessToken') || '';
      const rawUser = localStorage.getItem('authUser');
      let hasValidUser = false;
      if (rawUser) {
        try {
          const u = JSON.parse(rawUser);
          hasValidUser = !!u && typeof u.id === 'string' && /^[0-9a-fA-F-]{36}$/.test(u.id);
        } catch (_) { hasValidUser = false; }
      }
      if (!token || !hasValidUser) {
        console.debug('[BookingsService] Missing or invalid auth (token/user) - skipping getMyBookings');
        // Return empty data but DON'T clear auth - let the user stay logged in
        return Promise.resolve({ data: [], meta: { total: 0, page, limit, lastPage: 1, totalPages: 1, totalItems: 0 } });
      }
    } catch (e) {
      // If any error reading storage, skip the call for safety
      console.debug('[BookingsService] Error checking auth in localStorage, skipping getMyBookings', e);
      return Promise.resolve({ data: [], meta: { total: 0, page, limit, lastPage: 1 } });
    }
    return firstValueFrom(this.http.get<any>(url, this.authHeaders()));
  }

  async getBookingById(bookingId: string): Promise<any> {
    if (!this.isBrowser) {
      console.warn('[BookingsService] SSR detected - skipping getBookingById network call');
      return Promise.resolve(null);
    }
    return firstValueFrom(this.http.get<any>(`${this.baseUrl.getApiBaseUrl()}/bookings/${bookingId}`, this.authHeaders()));
  }

  // Admin: get all bookings with pagination and optional status filter
  async getAdminBookings(page = 1, limit = 10, status?: string): Promise<any> {
    // Backend exposes admin booking list at /bookings/management/all
    let q = `${this.baseUrl.getApiBaseUrl()}/bookings/management/all?page=${page}&limit=${limit}`;
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
    const url = `${this.baseUrl.getApiBaseUrl()}/bookings/field/${fieldId}/schedule?date=${date}`;
    return firstValueFrom(this.http.get<any>(url, this.authHeaders()));
  }

  /**
   * Check-in cho khách hàng tại sân (Manager/Admin only)
   * @param bookingId ID của booking cần check-in
   */
  async checkIn(bookingId: string): Promise<any> {
    // Backend expects { identifier: string } (id or code)
    return firstValueFrom(this.http.post<any>(`${this.baseUrl.getApiBaseUrl()}/bookings/check-in`, { identifier: bookingId }, this.authHeaders()));
  }

  /**
   * Tạo booking tại quầy (Admin/Staff only)
   * @param payload Thông tin booking
   */
  async createBookingByAdmin(payload: any): Promise<any> {
    return firstValueFrom(this.http.post<any>(`${this.baseUrl.getApiBaseUrl()}/bookings/management/create`, payload, this.authHeaders()));
  }
}
