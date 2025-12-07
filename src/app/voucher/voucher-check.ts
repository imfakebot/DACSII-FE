import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VoucherService, VoucherCheckResponse } from '../services/voucher.service';

@Component({
  selector: 'app-voucher-check',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voucher-check.html',
  styleUrls: ['./voucher-check.scss'],
})
export class VoucherCheckComponent {
  code = '';
  orderValue = 500000;

  result: VoucherCheckResponse | null = null;
  error: string | null = null;
  loading = false;

  constructor(private voucherService: VoucherService) {}

  async checkVoucher(): Promise<void> {
    this.error = null;
    this.result = null;

    const trimmed = this.code.trim();
    if (!trimmed) {
      this.error = 'Vui lòng nhập mã voucher.';
      return;
    }
    if (!this.orderValue || Number(this.orderValue) <= 0) {
      this.error = 'Giá trị đơn hàng phải lớn hơn 0.';
      return;
    }

    this.loading = true;
    try {
      this.result = await this.voucherService.checkVoucher(trimmed, Number(this.orderValue));
    } catch (err: any) {
      console.warn('[VoucherCheckComponent] checkVoucher failed', err);
      this.error = err?.error?.message || err?.message || 'Không kiểm tra được voucher.';
    } finally {
      this.loading = false;
    }
  }

  get hasResult(): boolean {
    return !!this.result;
  }
}
