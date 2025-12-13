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

  // Indicates auth module finished initialization on the client
  private readySubject = new BehaviorSubject<boolean>(false);
  ready$ = this.readySubject.asObservable();

  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      try {
        const raw = localStorage.getItem('authUser');
        if (raw) this.userSubject.next(JSON.parse(raw));
      } catch {}
      // mark ready on browser after attempting to read storage
      this.readySubject.next(true);
    } else {
      // keep not-ready on server so templates can avoid showing guest UI during SSR
      this.readySubject.next(false);
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

  getCurrentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  /**
   * Returns true when the current user has an admin-like role.
   * Accepts role names like 'admin' and 'super_admin' (case-insensitive),
   * and will handle role being a string or an object with a `name` property.
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    let roleVal: any = user.role;
    if (!roleVal) return false;
    if (typeof roleVal === 'object') {
      roleVal = (roleVal.name || roleVal.role || '').toString();
    }
    const roleStr = String(roleVal || '').toLowerCase();
    return roleStr === 'admin' || roleStr === 'super_admin' || roleStr.includes('admin');
  }
}