import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'auth-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error: string | null = null;
  awaitingVerification = false;
  verificationCode = '';
  devOtpVisible = false;
  devOtp: string | null = null;

  constructor(private router: Router, private auth: AuthService) {}

  async submit() {
    if (!this.email || !this.password) {
      this.error = 'Vui lòng nhập email và mật khẩu';
      return;
    }
    this.loading = true;
    this.error = null;
    try {
      const res: any = await this.auth.loginInitiate(this.email, this.password);
      this.awaitingVerification = true;
      // Backend hiện chỉ trả message; nếu sau này trả verificationCode cho dev thì xử lý.
      if (res?.verificationCode) {
        this.devOtpVisible = true;
        this.devOtp = res.verificationCode;
        this.verificationCode = res.verificationCode;
      } else {
        this.devOtpVisible = false;
        this.devOtp = null;
      }
    } catch (e: any) {
      console.error('Login initiate error', e);
      this.error = this.extractErrorMessage(e) || 'Đăng nhập thất bại';
    } finally {
      this.loading = false;
    }
  }

  async completeVerification() {
    const cleaned = (this.verificationCode || '').trim().toUpperCase();
    if (!cleaned) {
      this.error = 'Vui lòng nhập mã xác thực';
      return;
    }
    if (cleaned.length !== 6) {
      this.error = 'Mã xác thực phải gồm 6 ký tự';
      return;
    }
    this.loading = true;
    this.error = null;
    try {
      const res: any = await this.auth.loginComplete(this.email, cleaned);
      // Lưu token nếu trả về
      if (res?.accessToken) {
        localStorage.setItem('accessToken', res.accessToken);
      }
      if (res?.refreshToken) {
        localStorage.setItem('refreshToken', res.refreshToken);
      }
      this.router.navigate(['/']);
    } catch (e: any) {
      console.error('Login complete error', e);
      this.error = this.extractErrorMessage(e) || 'Xác thực thất bại';
      // Cho phép người dùng thử lại vẫn giữ trạng thái awaitingVerification
    } finally {
      this.loading = false;
    }
  }

  private extractErrorMessage(err: any): string | null {
    if (!err) return null;
    if (err instanceof HttpErrorResponse) {
      const data = err.error;
      if (Array.isArray(data?.message)) return data.message.join('\n');
      if (typeof data?.message === 'string') return data.message;
      if (typeof data === 'string') return data;
      return err.message || null;
    }
    if (err.message) return err.message;
    return null;
  }
}
