import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UsersApiService, AccountMeResponse } from './users.service';
import { AuthStateService } from './auth-state.service';

@Injectable({ providedIn: 'root' })
export class MeStateService {
  private accountSubject = new BehaviorSubject<AccountMeResponse | null>(null);
  readonly account$ = this.accountSubject.asObservable();
  private loading = false;

  constructor(
    private usersApi: UsersApiService,
    private authState: AuthStateService,
  ) {}

  get snapshot(): AccountMeResponse | null {
    return this.accountSubject.value;
  }

  isLoading(): boolean {
    return this.loading;
  }

  async load(force = false): Promise<AccountMeResponse | null> {
    if (!force && this.accountSubject.value) {
      return this.accountSubject.value;
    }

    if (!this.usersApi.hasAccessToken()) {
      this.clear();
      return null;
    }

    this.loading = true;
    try {
      const me = await this.usersApi.getMe();
      if (!me || !me.id) {
        // Backend returned 200 but no content or incomplete object. Treat as "no data".
        console.warn('[MeStateService] /users/me returned no account data', me);
        this.clear();
        return null;
      }
      this.accountSubject.next(me);
      this.authState.setUser({
        id: me.id,
        email: me.email,
        full_name: me.userProfile?.full_name || me.email,
        role: me.role?.name,
      });
      return me;
    } catch (error: any) {
      if (error?.status === 401) {
        this.clear();
        return null;
      }
      console.warn('[MeStateService] load error', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  clear(): void {
    this.accountSubject.next(null);
    this.authState.setUser(null);
  }
}
