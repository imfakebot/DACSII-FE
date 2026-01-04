import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

export interface BranchDto {
  id: string;
  name: string;
  phoneNumber?: string;
  phone_number?: string; // Backend snake_case
  address?: {
    id: string;
    street: string;
    wardId: string;
    cityId: string;
    latitude?: number;
    longitude?: number;
  };
  managerId?: string;
  manager_id?: string; // Backend snake_case
  manager?: {
    id: string;
    fullName: string;
    full_name?: string;
    phoneNumber: string;
    phone_number?: string;
  };
  fields?: any[];
  openTime?: string;
  open_time?: string; // Backend snake_case
  closeTime?: string;
  close_time?: string; // Backend snake_case
}

export interface AvailableManager {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
}

export interface CreateBranchDto {
  name: string;
  phoneNumber: string;
  managerId?: string;
  street: string;
  wardId: string;
  cityId: string;
  latitude?: number;
  longitude?: number;
  openTime: string;
  closeTime: string;
}

export interface UpdateBranchDto {
  name?: string;
  phoneNumber?: string;
  managerId?: string;
  street?: string;
  wardId?: string;
  cityId?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable({ providedIn: 'root' })
export class BranchAdminService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService) {}

  private authHeaders(): { headers: HttpHeaders } {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return { headers: new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' }) };
  }

  async getAll(): Promise<BranchDto[]> {
    return firstValueFrom(this.http.get<BranchDto[]>(`${this.baseUrl.getApiBaseUrl()}/branches`, this.authHeaders()));
  }

  async getById(id: string): Promise<BranchDto> {
    return firstValueFrom(this.http.get<BranchDto>(`${this.baseUrl.getApiBaseUrl()}/branches/${id}`, this.authHeaders()));
  }

  async create(dto: CreateBranchDto): Promise<BranchDto> {
    return firstValueFrom(this.http.post<BranchDto>(`${this.baseUrl.getApiBaseUrl()}/branches`, dto, this.authHeaders()));
  }

  async update(id: string, dto: UpdateBranchDto): Promise<BranchDto> {
    return firstValueFrom(this.http.put<BranchDto>(`${this.baseUrl.getApiBaseUrl()}/branches/${id}`, dto, this.authHeaders()));
  }

  async remove(id: string): Promise<{message: string}> {
    return firstValueFrom(this.http.delete<{message: string}>(`${this.baseUrl.getApiBaseUrl()}/branches/${id}`, this.authHeaders()));
  }

  async getAvailableManagers(): Promise<AvailableManager[]> {
    return firstValueFrom(this.http.get<AvailableManager[]>(`${this.baseUrl.getApiBaseUrl()}/branches/available-managers`, this.authHeaders()));
  }
}
