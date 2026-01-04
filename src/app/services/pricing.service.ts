import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

export interface CheckPriceDto {
  fieldId: string;
  startTime: string; // ISO 8601
  durationMinutes: number;
}

export interface BookingDetailsDto {
  date: string;
  start_time: string;
  end_time: string;
  duration: string;
}

export interface PricingDetailsDto {
  price_per_hour: number;
  total_price: number;
  currency: string;
  // Optional fields returned when voucher is applied or client-side adjusted
  original_price?: number;
  discount?: number;
}

export interface CheckPriceResponseDto {
  available: boolean;
  field_name: string;
  booking_details: BookingDetailsDto;
  pricing: PricingDetailsDto;
  // Optional voucher info (may be populated client-side)
  voucher?: {
    code: string;
    discount: number;
  } | null;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PricingService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService) {}

  async checkAvailability(payload: CheckPriceDto): Promise<CheckPriceResponseDto> {
    return firstValueFrom(this.http.post<CheckPriceResponseDto>(`${this.baseUrl.getApiBaseUrl()}/pricing/check-availability`, payload));
  }
}
