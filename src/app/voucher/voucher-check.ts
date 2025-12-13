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
  history: VoucherCheckResponse[] = [];

  constructor(private voucherService: VoucherService) {}

  ngOnInit(): void {
    try {
      const raw = localStorage.getItem('voucherChecks');
      if (raw) this.history = JSON.parse(raw) as VoucherCheckResponse[];
    } catch (e) {
      // ignore
    }
  }

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
      // push to history (keep last 8)
      if (this.result) {
        this.history = [this.result, ...this.history.filter(h => h.code !== this.result!.code)].slice(0, 8);
        try { localStorage.setItem('voucherChecks', JSON.stringify(this.history)); } catch(e) {}
      }
    } catch (err: any) {
      console.warn('[VoucherCheckComponent] checkVoucher failed', err);
      this.error = err?.error?.message || err?.message || 'Không kiểm tra được voucher.';
    } finally {
      this.loading = false;
    }
  }

  async copyCode(code?: string | null): Promise<void> {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      // small feedback: temporarily set error to success message
      const prev = this.error;
      this.error = null;
      this.result = { ...(this.result ?? {} as any), message: 'Mã đã được sao chép' } as VoucherCheckResponse;
      setTimeout(() => {
        if (this.result && this.result.message === 'Mã đã được sao chép') this.result.message = '';
        this.error = prev;
      }, 1200);
    } catch (e) {
      // fallback: do nothing
    }
  }

  get hasResult(): boolean {
    return !!this.result;
  }
}
