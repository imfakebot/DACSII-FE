import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Backend raw types (partial)
interface FieldImageBackend { image_url: string }
interface FieldTypeBackend { id: string; name: string }
interface CityBackend { id: string; name: string }
interface AddressBackend { id: string; street: string; city?: CityBackend }
interface FieldBackend {
  id: string;
  name: string;
  description?: string;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  fieldType?: FieldTypeBackend;
  address?: AddressBackend;
  images?: FieldImageBackend[];
  // possible aggregated fields
  avgRating?: number;
  avg_rating?: number;
  pricePerHour?: number;
  price_per_hour?: number;
}

// Front-end mapped type
export interface Field {
  id: string;
  name: string;
  description?: string;
  // templates expect both `fieldType` and `type` (legacy); provide both
  fieldType?: string;
  type?: string; // fieldType.name (alias)
  city?: string; // address.city.name
  images: string[]; // array of image URLs
  status: boolean;
  createdAt: string;
  avgRating?: number;
  pricePerHour?: number;
}

function mapField(raw: FieldBackend): Field {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    fieldType: raw.fieldType?.name,
    type: raw.fieldType?.name,
    city: raw.address?.city?.name,
    images: (raw.images || []).map(i => i.image_url),
    status: raw.status,
    createdAt: raw.createdAt,
    avgRating: raw.avgRating ?? raw.avg_rating ?? undefined,
    pricePerHour: raw.pricePerHour ?? raw.price_per_hour ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class FieldsService {
  constructor(private http: HttpClient) {}

  async getFields(): Promise<Field[]> {
    const data = await firstValueFrom(this.http.get<FieldBackend[]>(`/fields`));
    return data.map(mapField);
  }

  async getFieldById(id: string): Promise<Field> {
    const raw = await firstValueFrom(this.http.get<FieldBackend>(`/fields/${id}`));
    return mapField(raw);
  }
}
