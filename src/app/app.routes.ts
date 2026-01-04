import { Routes } from '@angular/router';


// Định nghĩa routes chính (Tiếng Việt):
// - '' hiển thị trang chủ (BodyComponent)
// - 'fields' hiển thị danh sách sân
// - 'detail/:id' hiển thị chi tiết 1 sân
export const routes: Routes = [
	{ path: '', loadComponent: () => import('./body/body').then(m => m.BodyComponent) },
	{ path: 'football', loadComponent: () => import('./football/football-list').then(m => m.FieldsListComponent) },
	{ path: 'tennis', loadComponent: () => import('./tennis/tennis-list').then(m => m.TennisListComponent) },
	{ path: 'badminton', loadComponent: () => import('./badminton/badminton-list').then(m => m.BadmintonListComponent) },
	{ path: 'table-tennis', loadComponent: () => import('./table-tennis/table-tennis-list').then(m => m.TableTennisListComponent) },
	{ path: 'fields', redirectTo: 'football', pathMatch: 'full' },
	{ path: 'detail/:id', loadComponent: () => import('./field-details/detail').then(m => m.DetailComponent) },
	{ path: 'Login/login', loadComponent: () => import('./Login/login').then(m => m.LoginComponent) },
	{ path: 'Register/register', loadComponent: () => import('./Register/register').then(m => m.RegisterComponent) },
	{ path: 'forgot-password', loadComponent: () => import('./ForgotPassword/forgot-password').then(m => m.ForgotPasswordComponent) },
	{ path: 'reset-password', loadComponent: () => import('./ResetPassword/reset-password').then(m => m.ResetPasswordComponent) },
	{ path: 'profile', loadComponent: () => import('./users/profile').then(m => m.ProfileComponent) },
	{ path: 'notifications', loadComponent: () => import('./notifications/notifications').then(m => m.NotificationsComponent) },
	{ path: 'bookings', loadComponent: () => import('./my-bookings/my-bookings').then(m => m.MyBookingsComponent) },
	{ path: 'feedbacks', loadComponent: () => import('./feedbacks/my-feedbacks').then(m => m.MyFeedbacksComponent) },
	{ path: 'feedbacks/:id', loadComponent: () => import('./feedbacks/feedback-detail').then(m => m.FeedbackDetailComponent) },
	{ path: 'review', loadComponent: () => import('./review/review-form').then(m => m.ReviewFormComponent) },
	{ path: 'voucher', loadComponent: () => import('./voucher/voucher-check').then(m => m.VoucherCheckComponent) },
	{ path: 'payment-success', loadComponent: () => import('./payment-success/payment-success').then(m => m.PaymentSuccessComponent) },
	{ path: 'booking-success', loadComponent: () => import('./payment-success/payment-success').then(m => m.PaymentSuccessComponent) },
	{ path: 'vnpay-return', loadComponent: () => import('./vnpay-return/vnpay-return').then(m => m.VnpayReturnComponent) },
	{ path: 'admin/dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent) },
	{ path: 'admin/users', loadComponent: () => import('./users/admin/admin-users').then(m => m.AdminUsersComponent) },
	{ path: 'admin/fields', loadComponent: () => import('./fields/admin-fields').then(m => m.AdminFieldsComponent) },
	{ path: 'admin/fields/create', loadComponent: () => import('./fields/admin-field-form').then(m => m.AdminFieldFormComponent) },
	{ path: 'admin/fields/:id/edit', loadComponent: () => import('./fields/admin-field-form').then(m => m.AdminFieldFormComponent) },
	{ path: 'admin/feedbacks', loadComponent: () => import('./feedbacks/admin-feedbacks').then(m => m.AdminFeedbacksComponent) },
	{ path: 'admin/feedback/:id', loadComponent: () => import('./feedbacks/feedback-detail').then(m => m.FeedbackDetailComponent) },
	{ path: 'admin/bookings', loadComponent: () => import('./booking-management/admin-bookings').then(m => m.AdminBookingsComponent) },
	{ path: 'admin/vouchers', loadComponent: () => import('./voucher/admin-voucher').then(m => m.AdminVoucherComponent) },
	{ path: 'admin/reviews', loadComponent: () => import('./review/admin-review').then(m => m.AdminReviewComponent) },
	{ path: 'admin/utilities', loadComponent: () => import('./utility/admin-utilities').then(m => m.AdminUtilitiesComponent) },
	{ path: 'admin/branches', loadComponent: () => import('./admin/admin-branches').then(m => m.AdminBranchesComponent) },
	// Static pages
	{ path: 'about', loadComponent: () => import('./pages/about/about').then(m => m.AboutComponent) },
	{ path: 'contact', loadComponent: () => import('./pages/contact/contact').then(m => m.ContactComponent) },
	// 404 page
	{ path: '404', loadComponent: () => import('./404/404').then(m => m.NotFoundComponent) },
	// Wildcard route phải đặt cuối cùng
	{ path: '**', redirectTo: '/404' }
];
