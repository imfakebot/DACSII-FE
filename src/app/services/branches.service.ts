import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Branch { id: string; name: string }

@Injectable({ providedIn: 'root' })
export class BranchesService {
  // A small helper that attempts a list of possible endpoints and returns the first successful array
  private probes = [
    '/branches',
    '/branches/all',
    '/branch',
    '/branch/list',
    '/branches/list',
    '/locations/branches'
  ];

  constructor(private http: HttpClient) {}

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
