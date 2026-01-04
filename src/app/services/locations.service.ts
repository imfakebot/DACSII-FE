import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

export interface City { id: number; name: string }
export interface Ward { id: number; name: string; cityId?: number }

@Injectable({ providedIn: 'root' })
export class LocationsService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService) {}

  async getCities(): Promise<City[]> {
    return firstValueFrom(this.http.get<City[]>(`${this.baseUrl.getApiBaseUrl()}/locations/cities`));
  }

  async getWardsByCityId(cityId: number): Promise<Ward[]> {
    return firstValueFrom(this.http.get<Ward[]>(`${this.baseUrl.getApiBaseUrl()}/locations/wards/${cityId}`));
  }
}
