import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Backend raw types (partial)
interface FieldImageBackend { image_url: string }
interface FieldTypeBackend { id: string; name: string }
interface CityBackend { id: string | number; name: string }
interface WardBackend { id: string | number; name: string }
interface AddressBackend { id: string; street: string; ward?: WardBackend; city?: CityBackend }
interface OwnerBackend { id: string; full_name?: string }
interface FieldBackend {
  id: string;
  name: string;
  description?: string;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  fieldType?: FieldTypeBackend;
  field_type_id?: string;
  address?: AddressBackend;
  owner?: OwnerBackend;
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
  fieldTypeId?: string;
  street?: string; // address.street
  ward?: string; // address.ward.name
  city?: string; // address.city.name
  ownerName?: string; // owner.full_name
  images: string[]; // array of image URLs
  status: boolean;
  createdAt: string;
  avgRating?: number;
  pricePerHour?: number;
}

function mapField(raw: FieldBackend): Field {
  const normalizeImageUrl = (u?: string) => {
    if (!u) return '';
    // Convert backslashes to forward slashes
    let s = u.replace(/\\/g, '/');
    // If path contains 'src/assets', collapse everything before to '/assets/'
    s = s.replace(/.*src\/assets\//i, '/assets/');
    // If it's a Windows absolute path like C:/.../assets/..., ensure leading '/'
    if (!s.startsWith('http') && !s.startsWith('/')) s = '/' + s;
    return s;
  };
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    fieldType: raw.fieldType?.name,
    type: raw.fieldType?.name,
    fieldTypeId: raw.fieldType?.id ?? raw.field_type_id,
    street: raw.address?.street,
    ward: raw.address?.ward?.name as any,
    city: raw.address?.city?.name,
    ownerName: raw.owner?.full_name,
    images: (raw.images || []).map(i => normalizeImageUrl(i.image_url)),
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

  // Admin-only helpers (caller must hold Admin access token)
  private authHeaders() {
    const token = localStorage.getItem('accessToken') || '';
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }

  async createField(payload: any): Promise<any> {
    return firstValueFrom(this.http.post(`/fields`, payload, this.authHeaders()));
  }

  async updateField(id: string, payload: any): Promise<any> {
    return firstValueFrom(this.http.put(`/fields/${id}`, payload, this.authHeaders()));
  }

  async deleteField(id: string): Promise<{ message: string }> {
    return firstValueFrom(this.http.delete<{ message: string }>(`/fields/${id}`, this.authHeaders()));
  }

  async uploadImages(fieldId: string, files: File[]): Promise<any> {
    const form = new FormData();
    for (const f of files) form.append('images', f);
    return firstValueFrom(this.http.post(`/fields/${fieldId}/images`, form, this.authHeaders()));
  }
}
