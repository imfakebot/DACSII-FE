import { Injectable, Inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  user$ = this.userSubject.asObservable();

  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      try {
        const raw = localStorage.getItem('authUser');
        if (raw) this.userSubject.next(JSON.parse(raw));
      } catch { /* ignore */ }
    }
  }

  setUser(user: AuthUser | null) {
    this.userSubject.next(user);
    if (!this.isBrowser) return; // Không thao tác storage khi SSR
    try {
      if (user) {
        localStorage.setItem('authUser', JSON.stringify(user));
      } else {
        localStorage.removeItem('authUser');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch { /* ignore quota / security errors */ }
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  getUserName(): string | null {
    return this.userSubject.value?.full_name || this.userSubject.value?.email || null;
  }
}