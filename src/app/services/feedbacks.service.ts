import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CreateFeedbackDto { 
  subject: string; 
  message: string;
}

export interface ReplyFeedbackDto {
  message: string;
}

export interface FeedbackResponseDto {
  id: string;
  message: string;
  sender_type: 'user' | 'admin';
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
  };
}

export interface FeedbackDto { 
  id: string; 
  title?: string;
  subject?: string;
  category?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  submitter?: {
    id: string;
    full_name: string;
    email: string;
  };
  responses?: FeedbackResponseDto[];
}

@Injectable({ providedIn: 'root' })
export class FeedbacksService {
  constructor(private http: HttpClient) {}

  private authHeaders(): { headers: HttpHeaders } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async create(payload: CreateFeedbackDto): Promise<FeedbackDto> {
    return firstValueFrom(this.http.post<FeedbackDto>(`/feedbacks`, payload, this.authHeaders()));
  }

  async getMyFeedbacks(): Promise<FeedbackDto[]> {
    return firstValueFrom(this.http.get<FeedbackDto[]>(`/feedbacks/me`, this.authHeaders()));
  }

  // Admin
  async getAllAdmin(): Promise<FeedbackDto[]> {
    return firstValueFrom(this.http.get<FeedbackDto[]>(`/feedbacks/admin/all`, this.authHeaders()));
  }

  async getDetail(id: string): Promise<FeedbackDto> {
    return firstValueFrom(this.http.get<FeedbackDto>(`/feedbacks/${id}`, this.authHeaders()));
  }

  async reply(id: string, dto: ReplyFeedbackDto): Promise<FeedbackResponseDto> {
    return firstValueFrom(this.http.post<FeedbackResponseDto>(`/feedbacks/${id}/reply`, dto, this.authHeaders()));
  }
}
