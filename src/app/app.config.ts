import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER, PLATFORM_ID, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { authInterceptorProvider } from './interceptors/auth.interceptor';
import { MeStateService } from './services/me-state.service';

/**
 * APP_INITIALIZER factory function to verify auth token on app startup.
 * If token is invalid/expired, auth state will be cleared automatically.
 */
function initializeAuth(meState: MeStateService, platformId: object) {
  return async () => {
    // Only verify token on browser (not during SSR)
    if (isPlatformBrowser(platformId)) {
      try {
        await meState.load(false);
      } catch (e) {
        // Silently handle error - MeStateService will clear auth on 401
        console.log('[AppInit] Auth verification failed', e);
      }
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    authInterceptorProvider,
    {
      provide: APP_INITIALIZER,
      useFactory: (meState: MeStateService, platformId: object) => initializeAuth(meState, platformId),
      deps: [MeStateService, PLATFORM_ID],
      multi: true,
    },
  ]
};
