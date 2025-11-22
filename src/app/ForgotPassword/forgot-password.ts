import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss']
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  async submit(){
    this.error = null; this.success = null;
    if(!this.email){ this.error = 'Vui lòng nhập email'; return; }
    this.loading = true;
    try {
      const res = await this.auth.forgotPassword(this.email);
      this.success = res.message;
    } catch(e: any){
      this.error = this.extractErrorMessage(e) || 'Yêu cầu thất bại';
    } finally { this.loading = false; }
  }

  navigateLogin(){ this.router.navigate(['/Login/login']); }

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