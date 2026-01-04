import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseUrlService } from '../base_url';

export interface Branch { id: string; name: string }

@Injectable({ providedIn: 'root' })
export class BranchesService {
  constructor(private http: HttpClient, private baseUrl: BaseUrlService) {}

  // A small helper that attempts a list of possible endpoints and returns the first successful array
  private get probes() {
    const base = this.baseUrl.getApiBaseUrl();
    return [
      `${base}/branches`,
      `${base}/branches/all`,
      `${base}/branch`,
      `${base}/branch/list`,
      `${base}/branches/list`,
      `${base}/locations/branches`
    ];
  }

  async listBranches(): Promise<Branch[]> {
    for (const p of this.probes) {
      try {
        const res = await firstValueFrom(this.http.get<any>(p));
        if (!res) continue;
        // Many APIs wrap results: try common shapes
        const items = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : (Array.isArray(res.items) ? res.items : null));
        if (items && items.length) {
          // normalize to {id, name}
          return items.map((it: any) => ({ id: String(it.id ?? it._id ?? it.branchId ?? it.branch_id ?? it.uuid ?? it.value), name: it.name ?? it.title ?? it.branch_name ?? it.displayName ?? it.label ?? String(it.id) }));
        }
      } catch (e) {
        // ignore and try next probe
      }
    }
    // none succeeded
    return [];
  }
}
