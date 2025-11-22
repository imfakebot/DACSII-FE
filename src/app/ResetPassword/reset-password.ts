import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss']
})
export class ResetPasswordComponent {
  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private route: ActivatedRoute, private auth: AuthService, private router: Router) {
    this.token = (this.route.snapshot.queryParamMap.get('token') || '').trim();
  }

  async submit(){
    this.error = null; this.success = null;
    if(!this.token){ this.error = 'Thiếu token đặt lại mật khẩu'; return; }
    if(!this.newPassword || this.newPassword.length < 8){ this.error = 'Mật khẩu tối thiểu 8 ký tự'; return; }
    if(this.newPassword !== this.confirmPassword){ this.error = 'Mật khẩu xác nhận không khớp'; return; }
    this.loading = true;
    try {
      const res = await this.auth.resetPassword(this.token, this.newPassword);
      this.success = res.message;
      setTimeout(()=> this.router.navigate(['/Login/login']), 1500);
    } catch(e: any){
      this.error = this.extractErrorMessage(e) || 'Đặt lại mật khẩu thất bại';
    } finally { this.loading = false; }
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
    return err.message || null;
  }
}