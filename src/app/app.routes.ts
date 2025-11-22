import { Routes } from '@angular/router';


// Định nghĩa routes chính (Tiếng Việt):
// - '' hiển thị trang chủ (BodyComponent)
// - 'fields' hiển thị danh sách sân
// - 'detail/:id' hiển thị chi tiết 1 sân
export const routes: Routes = [
	{ path: '', loadComponent: () => import('./body/body').then(m => m.BodyComponent) },
	{ path: 'fields', loadComponent: () => import('./fields/fields-list').then(m => m.FieldsListComponent) },
	{ path: 'detail/:id', loadComponent: () => import('./field-details/detail').then(m => m.DetailComponent) },
	// legacy alias (kept for compatibility)
	{ path: 'fields-list', redirectTo: 'fields' },
	{ path: 'Login/login', loadComponent: () => import('./Login/login').then(m => m.LoginComponent) },
	{ path: 'Register/register', loadComponent: () => import('./Register/register').then(m => m.RegisterComponent) },
	{ path: 'forgot-password', loadComponent: () => import('./ForgotPassword/forgot-password').then(m => m.ForgotPasswordComponent) },
	{ path: 'reset-password', loadComponent: () => import('./ResetPassword/reset-password').then(m => m.ResetPasswordComponent) },
	// fallback
	{ path: '**', redirectTo: '' }
];
