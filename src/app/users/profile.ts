import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsersApiService, UpdateUserProfileDto, GenderType, AccountMeResponse } from '../services/users.service';
import { BookingsService } from '../services/bookings.service';
import { AuthStateService } from '../services/auth-state.service';
import { MeStateService } from '../services/me-state.service';
import { BaseUrlService } from '../base_url';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  // Profile fields
  email: string = '';
  full_name: string = '';
  phone_number: string = '';
  gender: GenderType | '' = '';
  bio: string = '';
  date_of_birth: string = '';
  avatar_url: string = '';
  avatarFile: File | null = null;
  avatarPreviewUrl: string | null = null;
  avatarLoadFailed = false;
  avatarRetryAttempted = false;
  private previousAvatarUrl: string | null = null;
  is_profile_complete = false;
  roleName: string = '';
  providerLabel = '';
  accountStatusLabel = '';
  accountStatusCode = 'unknown';
  isVerified = false;
  twoFactorEnabled = false;
  lastLoginDisplay = 'Chưa đăng nhập';

  loading = false;
  error: string | null = null;
  success: string | null = null;
  // Change password state
  changeOldPassword: string = '';
  changeNewPassword: string = '';
  changeConfirmPassword: string = '';
  changeLoading = false;
  changeError: string | null = null;
  changeSuccess: string | null = null;

  // Cancel booking helper
  cancelBookingId: string = '';
  cancelMessage: string | null = null;
  cancelError: string | null = null;

  requiresLogin = false;

  @ViewChild('avatarFileInput') avatarFileInput?: ElementRef<HTMLInputElement>;

  constructor(
    private users: UsersApiService,
    private bookings: BookingsService,
    private authState: AuthStateService,
    private meState: MeStateService,
    private baseUrl: BaseUrlService,
  ) {}

  async ngOnInit(){
    this.loading = true; this.error = null; this.success = null;
    const cachedAccount = this.meState.snapshot;
    if (cachedAccount) {
      this.applyAccount(cachedAccount);
    } else {
      const cachedUser = this.authState.getCurrentUser();
      if (cachedUser?.email) {
        this.email = cachedUser.email;
      }
    }

    if (!this.users.hasAccessToken()) {
      this.handleUnauthorized('Bạn cần đăng nhập để xem và cập nhật hồ sơ của mình.');
      this.loading = false;
      return;
    }

    try{
      const me = await this.meState.load(!cachedAccount);
      if (!me) {
        // Backend returned no account data. Show a helpful error and avoid marking user as unauthenticated here.
        console.warn('[ProfileComponent] /users/me returned empty - no account data');
        this.error = 'Không tìm thấy thông tin tài khoản của bạn. Vui lòng làm mới trang hoặc thử đăng nhập lại.';
        return;
      }
      this.requiresLogin = false;
      this.applyAccount(me);
    }catch(e: any){
      this.handleLoadError(e);
    }finally{ this.loading = false; }
  }

  ngOnDestroy(): void {
    this.releaseAvatarPreview();
  }

  async save(){
    if (this.requiresLogin) {
      this.error = 'Bạn cần đăng nhập trước khi cập nhật hồ sơ.';
      return;
    }
    this.loading = true; this.error = null; this.success = null;
    try{
      const payload: UpdateUserProfileDto = {
        full_name: this.full_name || undefined,
        phone_number: this.phone_number || undefined,
        gender: (this.gender as any) || undefined,
        bio: this.bio || undefined,
        date_of_birth: this.date_of_birth || undefined,
      };
      const res = await this.users.updateMyProfile(payload);
      let message = res?.message || 'Cập nhật hồ sơ thành công';
      if (this.avatarFile) {
        try {
          await this.uploadSelectedAvatar();
          message += ' Ảnh đại diện đã được cập nhật.';
        } catch (uploadError: any) {
          this.handleLoadError(uploadError, 'Tải ảnh đại diện thất bại');
          return;
        }
      }
      this.success = message;
      const refreshed = await this.meState.load(true);
      if (refreshed) {
        this.applyAccount(refreshed);
      }
    }catch(e: any){
      this.handleLoadError(e, 'Cập nhật hồ sơ thất bại');
    }finally{ this.loading = false; }
  }

  async changePassword() {
    this.changeError = null;
    this.changeSuccess = null;
    if (!this.changeOldPassword || !this.changeNewPassword || !this.changeConfirmPassword) {
      this.changeError = 'Vui lòng điền đầy đủ các trường.';
      return;
    }
    if (this.changeNewPassword.length < 8) {
      this.changeError = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
      return;
    }
    if (this.changeNewPassword !== this.changeConfirmPassword) {
      this.changeError = 'Mật khẩu mới và xác nhận không khớp.';
      return;
    }

    this.changeLoading = true;
    try {
      const res = await this.users.changePassword(this.changeOldPassword, this.changeNewPassword);
      this.changeSuccess = res?.message || 'Đổi mật khẩu thành công.';
      // Clear fields on success
      this.changeOldPassword = '';
      this.changeNewPassword = '';
      this.changeConfirmPassword = '';
    } catch (err: any) {
      // Try to extract message from nested error responses
      this.changeError = err?.error?.message || err?.message || 'Đổi mật khẩu thất bại.';
    } finally {
      this.changeLoading = false;
    }
  }

  async cancelBooking(){
    this.cancelMessage = null; this.cancelError = null;
    const id = (this.cancelBookingId || '').trim();
    if(!id){ this.cancelError = 'Vui lòng nhập mã đặt sân'; return; }
    try{
      const res = await this.bookings.cancel(id);
      this.cancelMessage = res?.message || 'Hủy đặt sân thành công';
    }catch(e: any){
      this.cancelError = (e?.error?.message) || e?.message || 'Hủy đặt sân thất bại';
    }
  }

  private applyAccount(me: AccountMeResponse) {
    if (!me) {
      return;
    }
    this.clearAvatarSelection();
    this.email = me.email || this.email;
    this.providerLabel = this.mapProvider(me.provider);
    this.accountStatusLabel = this.mapStatus(me.status);
    this.accountStatusCode = (me.status || 'unknown').toLowerCase();
    this.isVerified = !!me.is_verified;
    this.twoFactorEnabled = !!me.two_factor_enabled;
    this.lastLoginDisplay = this.formatDateTime(me.last_login);
    const profile = me.userProfile;
    this.roleName = me.role?.name || '';
    if (profile) {
      this.full_name = profile.full_name || '';
      this.phone_number = profile.phone_number || '';
      this.gender = (profile.gender || '') as GenderType | '';
      this.bio = profile.bio || '';
      this.date_of_birth = profile.date_of_birth ? profile.date_of_birth.substring(0, 10) : '';
      this.avatar_url = this.normalizeAvatarUrl(profile.avatar_url) || '';
      // Reset avatar load state when applying account data
      this.avatarLoadFailed = false;
      this.avatarRetryAttempted = false;
      // Debug log to help diagnose missing avatar issues
      // eslint-disable-next-line no-console
      console.log('[ProfileComponent] applyAccount avatar_url =>', this.avatar_url);
      this.is_profile_complete = !!profile.is_profile_complete;
    } else {
      this.full_name = '';
      this.phone_number = '';
      this.gender = '';
      this.bio = '';
      this.date_of_birth = '';
      this.avatar_url = '';
      this.is_profile_complete = false;
    }
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input?.files || input.files.length === 0) {
      this.clearAvatarSelection();
      return;
    }
    const [file] = input.files;
    this.avatarFile = file;
    // Save current avatar to restore if user cancels selection
    this.previousAvatarUrl = this.avatar_url || null;
    this.createAvatarPreview(file);
  }

  clearAvatarSelection() {
    this.avatarFile = null;
    this.releaseAvatarPreview();
    if (this.avatarFileInput?.nativeElement) {
      this.avatarFileInput.nativeElement.value = '';
    }
    // Restore previous avatar URL if selection was cancelled
    if (this.previousAvatarUrl !== null) {
      this.avatar_url = this.previousAvatarUrl;
      this.previousAvatarUrl = null;
    }
  }

  private createAvatarPreview(file: File) {
    if (typeof window === 'undefined') {
      return;
    }
    this.releaseAvatarPreview();
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreviewUrl = reader.result as string;
      // Immediately show selected image as main avatar (optimistic preview)
      this.avatar_url = this.avatarPreviewUrl || '';
    };
    reader.readAsDataURL(file);
  }

  private releaseAvatarPreview() {
    this.avatarPreviewUrl = null;
  }

  private async uploadSelectedAvatar(): Promise<void> {
    if (!this.avatarFile) {
      return;
    }
    const updatedProfile = await this.users.uploadAvatar(this.avatarFile);
    // Debug log the server response for avatar upload
    // eslint-disable-next-line no-console
    console.log('[ProfileComponent] uploadSelectedAvatar response', updatedProfile);
    if (updatedProfile?.avatar_url) {
      this.avatar_url = this.normalizeAvatarUrl(updatedProfile.avatar_url);
      this.avatarLoadFailed = false;
      // eslint-disable-next-line no-console
      console.log('[ProfileComponent] uploadSelectedAvatar avatar_url =>', this.avatar_url);
    }
    this.clearAvatarSelection();
  }

  onAvatarLoadError(event: Event) {
    // If remote image fails to load, show initials fallback and surface URL for debugging
    // eslint-disable-next-line no-console
    console.warn('[ProfileComponent] avatar image failed to load', { url: this.avatar_url, event });
    // If we haven't attempted to repair a known backend 'undefined' bug, try once
    if (!this.avatarRetryAttempted && this.avatar_url && this.avatar_url.includes('/undefined/')) {
      const alt = this.avatar_url.replace('/undefined/', '/');
      // eslint-disable-next-line no-console
      console.log('[ProfileComponent] retrying avatar with cleaned URL ->', alt);
      this.avatarRetryAttempted = true;
      this.avatar_url = alt;
      return; // let the image try to load again
    }
    this.avatarLoadFailed = true;
    // keep avatar_url so developer can inspect it; UI will show initials when avatarLoadFailed
  }

  private normalizeAvatarUrl(url?: string | null): string {
    if (!url) return '';
    // Normalize backslashes to forward slashes (Windows paths)
    url = url.replace(/\\/g, '/');
    // If URL contains leftover 'undefined' segment from backend, remove it
    if (url.includes('/undefined/')) {
      url = url.replace('/undefined/', '/');
    }
    // If it's an absolute URL (likely from backend), and it contains '/uploads/',
    // convert it to a relative path so the browser requests it from the FE origin
    // (dev proxy will forward /uploads -> backend). This avoids NotSameOrigin errors.
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const uploadsIndex = url.indexOf('/uploads/');
      if (uploadsIndex !== -1) {
        return url.substring(uploadsIndex); // returns '/uploads/xxx'
      }
      // If it is absolute but not under /uploads, just return as-is
      return url;
    }

    try {
      const backendOrigin = new URL(this.baseUrl.getAuthBaseUrl()).origin;
      // If url already begins with '/', join with origin (for other uses),
      // but prefer returning relative /uploads path when possible.
      if (url.startsWith('/')) {
        // if it's an uploads path, keep it relative (so proxy handles it)
        if (url.startsWith('/uploads/')) return url;
        return `${backendOrigin}${url}`;
      }
      // Otherwise assume relative path under backend; prefer leading slash
      return `/${url}`;
    } catch {
      return url;
    }
  }

  private handleLoadError(err: any, fallbackMessage = 'Không tải được hồ sơ') {
    if (err?.status === 401) {
      this.handleUnauthorized('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    } else {
      console.warn('[ProfileComponent] load error', err);
      this.error = (err?.error?.message) || err?.message || fallbackMessage;
    }
  }

  get profileInitials(): string {
    const base = this.full_name || this.email || '';
    if (!base) {
      return '?';
    }
    return base
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || '?';
  }

  private mapProvider(provider: string | undefined): string {
    switch (provider) {
      case 'google':
        return 'Đăng nhập Google';
      case 'facebook':
        return 'Đăng nhập Facebook';
      case 'credentials':
      case 'local':
      default:
        return 'Đăng nhập Email/Mật khẩu';
    }
  }

  private mapStatus(status: string | undefined): string {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'Đang hoạt động';
      case 'inactive':
        return 'Tạm ngưng';
      case 'banned':
        return 'Bị cấm';
      case 'suspended':
        return 'Bị đình chỉ';
      case 'deleted':
        return 'Đã xóa';
      default:
        return 'Không xác định';
    }
  }

  private formatDateTime(value?: string | null): string {
    if (!value) {
      return 'Chưa đăng nhập';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Chưa đăng nhập';
    }
    return new Intl.DateTimeFormat('vi-VN', {
      hour12: false,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private handleUnauthorized(message: string) {
    this.authState.setUser(null);
    this.requiresLogin = true;
    this.error = message;
  }

  

}
