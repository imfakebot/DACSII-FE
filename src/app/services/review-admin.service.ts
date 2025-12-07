import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ReviewDto, PaginatedReviewResponse } from './review.service';

@Injectable({ providedIn: 'root' })
export class ReviewAdminService {
  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async getAll(page = 1, limit = 20): Promise<PaginatedReviewResponse> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return firstValueFrom(this.http.get<PaginatedReviewResponse>(`/review/management/all`, { params, ...this.authHeaders() }));
  }

  async deleteReview(id: string): Promise<{ message: string }> {
    return firstValueFrom(this.http.delete<{ message: string }>(`/review/${id}`, this.authHeaders()));
  }
}
