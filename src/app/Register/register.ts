import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
// Dùng import tương đối để tránh lỗi "missing from TypeScript compilation"
import { AuthService } from '../services/auth.service';
import { FormsModule } from "@angular/forms";
import { HttpErrorResponse } from '@angular/common/http';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  form!: FormGroup;

  loading = false;
  error: string | null = null;
  awaitingVerification = false; // cờ chuyển đổi giao diện sang bước nhập mã xác thực
  verificationCode = ''; // lưu trữ mã xac thực người dùng nhập

  constructor(private router: Router, private auth: AuthService, private fb: FormBuilder) {
    this.form = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      // VN phone: must start with 0 and have exactly 10 digits (simplified to match backend validator expectations)
      phone_number: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
      gender: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordsMatchValidator });
  }

  private passwordsMatchValidator(group: any) {
    const pw = group.get('password')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw && cpw && pw !== cpw ? { passwordsMismatch: true } : null;
  }

  async onSubmit() {
    this.loading = true;
    this.error = null;
    if (this.form.invalid) { this.loading = false; return; }

    try {
      const { email, password, full_name, phone_number, gender } = this.form.getRawValue();
      // Sanitize inputs coming from the form to avoid sending undefined/null
      const safeEmail = (email || '').toString().trim();
      const safePassword = (password || '').toString();
      const safeFullName = (full_name || '').toString().trim();
      const safePhone = (phone_number || '').toString().trim();
      const payload: any = { email: safeEmail, password: safePassword, full_name: safeFullName, phone_number: safePhone };
      if (gender) payload.gender = gender;

      // Quick client-side sanity check to prevent sending empty phone/email
      if (!payload.email || !payload.password || !payload.full_name || !payload.phone_number) {
        this.error = 'Vui lòng điền đầy đủ thông tin hợp lệ trước khi gửi.';
        this.loading = false;
        return;
      }

      // Debug: log payload so you can inspect Network/Console to compare with Postman
      // Remove or disable in production.
      // eslint-disable-next-line no-console
      console.log('Register payload (frontend):', payload);
      // Call initiate registration (backend will send verification code to email)
      await this.auth.register(payload);
      this.awaitingVerification = true;
    } catch (e: any) {
      this.error = this.extractErrorMessage(e) || 'Đăng ký thất bại';
    } finally {
      this.loading = false;
    }
  }

  async completeVerification() {
    const code = (this.verificationCode || '').trim().toUpperCase();
    if (!code || code.length !== 6) { this.error = 'Vui lòng nhập mã xác thực 6 ký tự'; return; }
    this.loading = true;
    this.error = null;
    try {
      const email = this.form.get('email')?.value as string;
      await this.auth.completeRegistration(email, code);
      // Sau khi xác thực thành công, chuyển về trang đăng nhập
      this.router.navigate(['/Login/login']);
    } catch (e: any) {
      this.error = this.extractErrorMessage(e) || 'Xác thực thất bại';
    } finally {
      this.loading = false;
    }
  }

  onReset() {
    this.form.reset();
    this.error = null;
  }

  private extractErrorMessage(err: any): string | null {
    if (!err) return null;
    // HttpErrorResponse from Angular
    if (err instanceof HttpErrorResponse) {
      const data = err.error;
      // Chuẩn hoá một số thông báo backend thành tiếng Việt, thân thiện
      const rawMessage = Array.isArray(data?.message)
        ? data.message.join('\n')
        : (typeof data?.message === 'string' ? data.message : (typeof data === 'string' ? data : err.message));
      if (typeof rawMessage === 'string') {
        // TH: Backend chưa seed role mặc định
        if (rawMessage.includes('Default role "User" not found')) {
          return 'Hệ thống chưa khởi tạo vai trò mặc định. Vui lòng liên hệ quản trị viên để seed dữ liệu (tạo role "User"). Đăng ký tạm thời chưa khả dụng.';
        }
      }
      // NestJS validation errors often return: { message: ['error1','error2'], error: 'Bad Request', statusCode: 400 }
      if (Array.isArray(data?.message)) {
        return data.message.join('\n');
      }
      if (typeof data?.message === 'string') {
        return data.message;
      }
      // Custom conflict messages
      if (typeof data === 'string') return data;
      return err.message || null;
    }
    // Generic JS Error
    if (err.message) return err.message;
    return null;
  }
}