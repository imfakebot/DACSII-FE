import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

export interface CreateReviewDto {
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface ReviewUserDto {
  id: string;
  full_name: string;
  email?: string;
}

export interface ReviewBookingDto {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
}

export interface ReviewFieldDto {
  id: string;
  name: string;
  field_type: string;
}

export interface ReviewDto {
  id: string;
  booking_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  updated_at?: string;
  user?: ReviewUserDto;
  booking?: ReviewBookingDto;
  field?: ReviewFieldDto;
}

export interface PaginatedReviewResponse { 
  data: ReviewDto[];
  total: number;
  page: number;
  limit: number;
  averageRating?: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService) {}

  private authHeaders(): { headers: HttpHeaders } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async createReview(payload: CreateReviewDto): Promise<ReviewDto> {
    return firstValueFrom(this.http.post<ReviewDto>(`${this.baseUrl.getApiBaseUrl()}/review`, payload, this.authHeaders()));
  }

  async getReviewsByField(fieldId: string, page = 1, limit = 10): Promise<PaginatedReviewResponse> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    const raw: any = await firstValueFrom(this.http.get(`${this.baseUrl.getApiBaseUrl()}/review/field/${fieldId}`, { params }));
    // Backend returns { data: [...], meta: { total, page, limit, averageRating } }
    const meta = raw?.meta || {};
    const mapped: PaginatedReviewResponse = {
      data: raw?.data || [],
      total: meta?.total ?? raw?.total ?? 0,
      page: meta?.page ?? raw?.page ?? page,
      limit: meta?.limit ?? raw?.limit ?? limit,
      averageRating: meta?.averageRating ?? undefined,
    };
    return mapped;
  }

  async deleteReview(id: string): Promise<{ message: string }> {
    return firstValueFrom(this.http.delete<{ message: string }>(`${this.baseUrl.getApiBaseUrl()}/review/${id}`, this.authHeaders()));
  }
}
