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
    path: 'football',
    renderMode: RenderMode.Server,
  },
  {
    path: 'tennis',
    renderMode: RenderMode.Server,
  },
  {
    path: 'badminton',
    renderMode: RenderMode.Server,
  },
  {
    path: 'table-tennis',
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
    path: 'bookings',
    // User bookings depend on auth state, force client rendering.
    renderMode: RenderMode.Client,
  },
  {
    path: 'notifications',
    // Notifications depend on auth state, force client rendering.
    renderMode: RenderMode.Client,
  },
  {
    path: 'feedbacks',
    // User feedbacks depend on auth state, force client rendering.
    renderMode: RenderMode.Client,
  },
  {
    path: 'feedbacks/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'review',
    // Review form depends on auth state.
    renderMode: RenderMode.Client,
  },
  {
    path: 'voucher',
    renderMode: RenderMode.Client,
  },
  {
    path: 'payment-success',
    renderMode: RenderMode.Client,
  },
  {
    path: 'booking-success',
    renderMode: RenderMode.Client,
  },
  {
    path: 'vnpay-return',
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
  // Admin routes - require auth, use client rendering
  {
    path: 'admin/dashboard',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/users',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/fields',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/fields/create',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/fields/:id/edit',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/feedbacks',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/feedback/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/bookings',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/vouchers',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/reviews',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/utilities',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/branches',
    renderMode: RenderMode.Client,
  },
  // Static pages
  {
    path: 'about',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'contact',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '404',
    renderMode: RenderMode.Prerender,
  },
  // Fallback - use client rendering for any other routes
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
