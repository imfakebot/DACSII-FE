import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CreateFeedbackDto { 
  title: string; 
  category: string;
  content: string;
}

export interface ReplyFeedbackDto {
  content: string;
}

export interface FeedbackResponseDto {
  id: string;
  // Backend uses `content` while some older front-end code expects `message`.
  message?: string;
  content?: string;
  sender_type: 'user' | 'admin';
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
  };
  // Backend uses `responder` field name for the user who sent the response
  responder?: {
    id: string;
    full_name?: string;
    email?: string;
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
  private readonly baseUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  private authHeaders(): { headers: HttpHeaders } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async create(payload: CreateFeedbackDto): Promise<FeedbackDto> {
    return firstValueFrom(this.http.post<FeedbackDto>(`${this.baseUrl}/feedbacks`, payload, this.authHeaders()));
  }

  async getMyFeedbacks(): Promise<FeedbackDto[]> {
    return firstValueFrom(this.http.get<FeedbackDto[]>(`${this.baseUrl}/feedbacks/me`, this.authHeaders()));
  }

  // Admin
  async getAllAdmin(): Promise<FeedbackDto[]> {
    return firstValueFrom(this.http.get<FeedbackDto[]>(`${this.baseUrl}/feedbacks/admin/all`, this.authHeaders()));
  }

  async getDetail(id: string): Promise<FeedbackDto> {
    const raw = await firstValueFrom(this.http.get<FeedbackDto>(`${this.baseUrl}/feedbacks/${id}`, this.authHeaders()));

    console.log('[FeedbacksService] Raw response from backend:', JSON.stringify(raw, null, 2));

    // Normalize shape: ensure responses array exists and each response has
    // a `content` field (backend uses `content`) and a `sender_type` field
    // for the frontend's rendering logic.
    const fb: any = raw || {};
    fb.responses = Array.isArray(fb.responses) ? fb.responses : [];
    try {
      for (const r of fb.responses) {
        // prefer backend `content`, fall back to older `message`
        r.content = r.content ?? r.message ?? '';
      }

      // If submitter is present, mark which responses are from the submitter
      if (fb.submitter && fb.submitter.id) {
        for (const r of fb.responses) {
          // If responder object exists and matches submitter id -> user
          if (r.responder && r.responder.id && String(r.responder.id) === String(fb.submitter.id)) {
            r.sender_type = 'user';
          } else {
            r.sender_type = 'admin';
          }
        }
      }
    } catch (err) {
      // if normalization fails, just return raw payload
      console.warn('[FeedbacksService] normalization error', err);
    }

    return fb as FeedbackDto;
  }

  async reply(id: string, dto: ReplyFeedbackDto): Promise<FeedbackResponseDto> {
    return firstValueFrom(this.http.post<FeedbackResponseDto>(`${this.baseUrl}/feedbacks/${id}/reply`, dto, this.authHeaders()));
  }
}
