import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface City { id: number; name: string }
export interface Ward { id: number; name: string; cityId?: number }

@Injectable({ providedIn: 'root' })
export class LocationsService {
  constructor(private http: HttpClient) {}

  async getCities(): Promise<City[]> {
    return firstValueFrom(this.http.get<City[]>(`/locations/cities`));
  }

  async getWardsByCityId(cityId: number): Promise<Ward[]> {
    return firstValueFrom(this.http.get<Ward[]>(`/locations/wards/${cityId}`));
  }
}
