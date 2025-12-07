import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VoucherAdminService } from '../services/voucher-admin.service';

@Component({
  selector: 'app-admin-voucher',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-voucher.html',
  styleUrls: [],
})
export class AdminVoucherComponent {
  code = '';
  discount = 0;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private svc: VoucherAdminService) {}

  async create(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.success = null;
    try {
      await this.svc.create({ code: this.code, discount_amount: this.discount, valid_from: new Date(), valid_to: new Date(Date.now()+7*24*3600*1000), quantity: 1 });
      this.success = 'Tạo voucher thành công';
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không tạo được voucher';
    } finally {
      this.loading = false;
    }
  }
}
