import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    // Home relies on live API data, so skip prerendering.
    renderMode: RenderMode.Server,
  },
  {
    path: 'fields',
    renderMode: RenderMode.Server,
  },
  {
    path: 'detail/:id',
    // Dynamic detail pages should render on-demand instead of prerendering.
    renderMode: RenderMode.Server,
  },
  {
    path: 'profile',
    // Profile depends on browser-only auth state, so force client rendering.
    renderMode: RenderMode.Client,
  },
  {
    path: 'Login/login',
    renderMode: RenderMode.Server,
  },
  {
    path: 'Register/register',
    renderMode: RenderMode.Server,
  },
  {
    path: 'forgot-password',
    renderMode: RenderMode.Server,
  },
  {
    path: 'reset-password',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
