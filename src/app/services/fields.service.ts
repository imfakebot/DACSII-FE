import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

// Backend raw types (partial)
interface FieldImageBackend { image_url: string }
interface FieldTypeBackend { id: string; name: string }
interface CityBackend { id: string | number; name: string }
interface WardBackend { id: string | number; name: string }
interface AddressBackend { id: string; street: string; ward?: WardBackend; city?: CityBackend; latitude?: number; longitude?: number }
interface OwnerBackend { id: string; full_name?: string }
interface UtilityBackend { id: number; name: string; price?: number; description?: string }
interface ManagerBackend { id: string; fullName?: string; phoneNumber?: string; full_name?: string; phone_number?: string }
interface BranchBackend { id: string; name: string; address?: AddressBackend; manager?: ManagerBackend; phoneNumber?: string; phone_number?: string }
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
  branch?: BranchBackend;
  images?: FieldImageBackend[];
  utilities?: UtilityBackend[];
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
  utilities?: Array<{id: number; name: string; price?: number; description?: string}>;
  branchPhone?: string;
  managerName?: string;
  latitude?: number;
  longitude?: number;
}

function mapField(raw: FieldBackend): Field {
  const normalizeImageUrl = (u?: string) => {
    if (!u) return '';
    
    // Skip invalid URLs containing 'undefined'
    if (u.includes('undefined')) {
      console.warn('[FieldsService] Skipping invalid image URL:', u);
      return '';
    }
    
    // Convert full backend URL to relative path for proxy
    // e.g., "http://localhost:3000/uploads/abc.jpg" -> "/uploads/abc.jpg"
    if (u.includes('/uploads/')) {
      const uploadsIndex = u.indexOf('/uploads/');
      return u.substring(uploadsIndex); // returns '/uploads/xxx'
    }
    
    // Convert backslashes to forward slashes
    let s = u.replace(/\\/g, '/');
    // If path contains 'src/assets', collapse everything before to '/assets/'
    s = s.replace(/.*src\/assets\//i, '/assets/');
    // If it's a relative path, ensure leading '/'
    if (!s.startsWith('http') && !s.startsWith('/')) s = '/' + s;
    return s;
  };

  // Prioritize branch.address over raw.address
  const address = raw.branch?.address || raw.address;
  const manager = raw.branch?.manager;
  const branchPhone = raw.branch?.phoneNumber || raw.branch?.phone_number;

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    fieldType: raw.fieldType?.name,
    type: raw.fieldType?.name,
    fieldTypeId: raw.fieldType?.id ?? raw.field_type_id,
    street: address?.street,
    ward: address?.ward?.name as any,
    city: address?.city?.name,
    ownerName: raw.owner?.full_name,
    images: (raw.images || [])
      .map(i => normalizeImageUrl(i.image_url))
      .filter(url => url !== ''), // Filter out empty/invalid URLs
    status: raw.status,
    createdAt: raw.createdAt,
    avgRating: raw.avgRating ?? raw.avg_rating ?? undefined,
    pricePerHour: raw.pricePerHour ?? raw.price_per_hour ?? undefined,
    utilities: raw.utilities?.map(u => ({
      id: u.id,
      name: u.name,
      price: u.price,
      description: u.description
    })) || [],
    branchPhone: branchPhone,
    managerName: manager?.fullName || manager?.full_name,
    latitude: address?.latitude,
    longitude: address?.longitude,
  };
}

@Injectable({ providedIn: 'root' })
export class FieldsService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService) {}

  async getFields(): Promise<Field[]> {
    const url = `${this.baseUrl.getApiBaseUrl()}/fields`;
    const data = await firstValueFrom(this.http.get<FieldBackend[]>(url));
    return data.map(mapField);
  }

  async getFieldById(id: string): Promise<Field> {
    const url = `${this.baseUrl.getApiBaseUrl()}/fields/${id}`;
    const raw = await firstValueFrom(this.http.get<FieldBackend>(url));
    return mapField(raw);
  }

  // Admin-only helpers (caller must hold Admin access token)
  private authHeaders() {
    const token = localStorage.getItem('accessToken') || '';
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }

  async createField(payload: any): Promise<any> {
    const url = `${this.baseUrl.getApiBaseUrl()}/fields`;
    return firstValueFrom(this.http.post(url, payload, this.authHeaders()));
  }

  async updateField(id: string, payload: any): Promise<any> {
    const url = `${this.baseUrl.getApiBaseUrl()}/fields/${id}`;
    return firstValueFrom(this.http.put(url, payload, this.authHeaders()));
  }

  async deleteField(id: string): Promise<{ message: string }> {
    const url = `${this.baseUrl.getApiBaseUrl()}/fields/${id}`;
    return firstValueFrom(this.http.delete<{ message: string }>(url, this.authHeaders()));
  }

  async uploadImages(fieldId: string, files: File[]): Promise<any> {
    const form = new FormData();
    for (const f of files) form.append('images', f);
    const url = `${this.baseUrl.getApiBaseUrl()}/fields/${fieldId}/images`;
    return firstValueFrom(this.http.post(url, form, this.authHeaders()));
  }

  /**
   * Get available field types from backend
   */
  async getFieldTypes(): Promise<{ id: string; name: string; description?: string }[]> {
    try {
      const url = `${this.baseUrl.getApiBaseUrl()}/field-types`;
      const data = await firstValueFrom(this.http.get<any[]>(url));
      return data.map(ft => ({ id: ft.id, name: ft.name, description: ft.description }));
    } catch (err) {
      console.error('[FieldsService] Failed to load field types:', err);
      return [];
    }
  }

  /**
   * Get available utilities from backend
   */
  async getUtilities(): Promise<{ id: number; name: string; price?: number }[]> {
    try {
      const url = `${this.baseUrl.getApiBaseUrl()}/utilities`;
      const data = await firstValueFrom(this.http.get<any[]>(url));
      return data.map(u => ({ id: u.id, name: u.name, price: u.price }));
    } catch (err) {
      console.error('[FieldsService] Failed to load utilities:', err);
      return [];
    }
  }
}
