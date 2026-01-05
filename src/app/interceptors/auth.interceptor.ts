import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HTTP_INTERCEPTORS,
  HttpClient,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthStateService } from '../services/auth-state.service';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BaseUrlService } from '../base_url';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authState = inject(AuthStateService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private baseUrl = inject(BaseUrlService);

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Add access token to request if available
    const accessToken = this.getAccessToken();
    if (accessToken && !request.headers.has('Authorization')) {
      request = this.addTokenToRequest(request, accessToken);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Only handle 401 on browser (not during SSR)
        if (isPlatformBrowser(this.platformId) && error.status === 401) {
          // Don't try to refresh if this is already a refresh request or auth request
          if (this.isAuthRequest(request.url)) {
            this.handleLogout();
            return throwError(() => error);
          }

          return this.handle401Error(request, next);
        }

        return throwError(() => error);
      })
    );
  }

  private addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private getAccessToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return localStorage.getItem('accessToken');
    } catch {
      return null;
    }
  }

  private isAuthRequest(url: string): boolean {
    return url.includes('/auth/refresh') || 
           url.includes('/auth/login') || 
           url.includes('/auth/register') ||
           url.includes('/auth/logout');
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return from(this.refreshToken()).pipe(
        switchMap((newToken: string) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(newToken);
          
          // Retry the original request with new token
          return next.handle(this.addTokenToRequest(request, newToken));
        }),
        catchError((refreshError) => {
          this.isRefreshing = false;
          this.handleLogout();
          return throwError(() => refreshError);
        })
      );
    } else {
      // Wait for the refresh to complete and then retry
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap((token) => {
          return next.handle(this.addTokenToRequest(request, token!));
        })
      );
    }
  }

  private async refreshToken(): Promise<string> {
    const url = `${this.baseUrl.getAuthBaseUrl()}/refresh`;
    
    try {
      const result = await fetch(url, {
        method: 'POST',
        credentials: 'include', // Important: send cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!result.ok) {
        throw new Error('Refresh token failed');
      }

      const data = await result.json();
      
      if (data?.accessToken) {
        try {
          localStorage.setItem('accessToken', data.accessToken);
        } catch { /* ignore */ }
        console.log('[AuthInterceptor] Token refreshed successfully');
        return data.accessToken;
      }

      throw new Error('No access token in refresh response');
    } catch (error) {
      console.log('[AuthInterceptor] Token refresh failed:', error);
      throw error;
    }
  }

  private handleLogout(): void {
    console.log('[AuthInterceptor] 401 Unauthorized - refresh failed, logging out');
    
    // Clear auth state
    this.authState.setUser(null);
    
    // Clear tokens from localStorage
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authUser');
    } catch { /* ignore */ }
    
    // Store the attempted URL for redirecting after login
    const currentUrl = this.router.url;
    if (!currentUrl.includes('/login') && !currentUrl.includes('/register')) {
      try {
        localStorage.setItem('redirectUrl', currentUrl);
      } catch {}
    }
  }
}

export const authInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};
