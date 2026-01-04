import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

export interface CreateUtilityDto {
  name: string;
  iconUrl?: string;
}

export interface UpdateUtilityDto {
  name?: string;
  iconUrl?: string;
}

export interface UtilityDto {
  id: number;
  name: string;
  iconUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class UtilityService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService) {}

  private authHeaders(): { headers: HttpHeaders } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async getAll(): Promise<UtilityDto[]> {
    return firstValueFrom(this.http.get<UtilityDto[]>(`${this.baseUrl.getApiBaseUrl()}/utilities`));
  }

  async getById(id: number): Promise<UtilityDto> {
    return firstValueFrom(this.http.get<UtilityDto>(`${this.baseUrl.getApiBaseUrl()}/utilities/${id}`));
  }

  async create(payload: CreateUtilityDto): Promise<UtilityDto> {
    return firstValueFrom(this.http.post<UtilityDto>(`${this.baseUrl.getApiBaseUrl()}/utilities`, payload, this.authHeaders()));
  }

  async update(id: number, payload: UpdateUtilityDto): Promise<UtilityDto> {
    return firstValueFrom(this.http.put<UtilityDto>(`${this.baseUrl.getApiBaseUrl()}/utilities/${id}`, payload, this.authHeaders()));
  }

  async delete(id: number): Promise<{ message: string }> {
    return firstValueFrom(this.http.delete<{ message: string }>(`${this.baseUrl.getApiBaseUrl()}/utilities/${id}`, this.authHeaders()));
  }
}
