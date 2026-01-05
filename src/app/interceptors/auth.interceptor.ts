import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthStateService } from '../services/auth-state.service';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authState = inject(AuthStateService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Only handle 401 on browser (not during SSR)
        if (isPlatformBrowser(this.platformId) && error.status === 401) {
          console.log('[AuthInterceptor] 401 Unauthorized detected, clearing auth state');
          
          // Clear auth state
          this.authState.setUser(null);
          
          // Optionally navigate to login page if not already there
          const currentUrl = this.router.url;
          if (!currentUrl.includes('/login') && !currentUrl.includes('/register')) {
            // Store the attempted URL for redirecting after login
            try {
              localStorage.setItem('redirectUrl', currentUrl);
            } catch {}
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}

export const authInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};
