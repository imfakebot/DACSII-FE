import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VoucherAdminService } from '../services/voucher-admin.service';

@Component({
  selector: 'app-admin-voucher',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-voucher.html',
  styleUrl: './admin-voucher.scss',
})
export class AdminVoucherComponent implements OnInit {
  // Form fields
  code = '';
  discountType: 'amount' | 'percentage' = 'percentage';
  discountAmount: number | null = null;
  discountPercentage: number | null = null;
  maxDiscountAmount: number | null = null;
  minOrderValue: number | null = null;
  validFrom = '';
  validTo = '';
  quantity: number = 100;
  
  loading = false;
  error: string | null = null;
  success: string | null = null;
  
  vouchers: any[] = [];
  loadingVouchers = false;
  vouchersError: string | null = null;
  deletingId: string | null = null;

  constructor(private svc: VoucherAdminService) {}

  async ngOnInit(): Promise<void> {
    // Set default dates
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.validFrom = now.toISOString().split('T')[0];
    this.validTo = nextWeek.toISOString().split('T')[0];
    
    await this.loadVouchers();
  }

  async loadVouchers(): Promise<void> {
    this.loadingVouchers = true;
    this.vouchersError = null;
    try {
      this.vouchers = await this.svc.getAll();
    } catch (err: any) {
      this.vouchersError = err?.error?.message || err?.message || 'Không thể tải danh sách voucher';
      console.error('Load vouchers failed:', err);
    } finally {
      this.loadingVouchers = false;
    }
  }

  resetForm(): void {
    this.code = '';
    this.discountType = 'percentage';
    this.discountAmount = null;
    this.discountPercentage = null;
    this.maxDiscountAmount = null;
    this.minOrderValue = null;
    this.quantity = 100;
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.validFrom = now.toISOString().split('T')[0];
    this.validTo = nextWeek.toISOString().split('T')[0];
  }

  async create(): Promise<void> {
    // Validation
    if (!this.code || !this.validFrom || !this.validTo || !this.quantity) {
      this.error = 'Vui lòng điền đầy đủ thông tin bắt buộc';
      return;
    }

    if (this.discountType === 'amount' && !this.discountAmount) {
      this.error = 'Vui lòng nhập số tiền giảm';
      return;
    }

    if (this.discountType === 'percentage' && !this.discountPercentage) {
      this.error = 'Vui lòng nhập phần trăm giảm';
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    try {
      const payload: any = {
        code: this.code.toUpperCase().trim(),
        validFrom: new Date(this.validFrom + 'T00:00:00.000Z').toISOString(),
        validTo: new Date(this.validTo + 'T23:59:59.999Z').toISOString(),
        quantity: this.quantity
      };

      // Add discount type
      if (this.discountType === 'amount' && this.discountAmount) {
        payload.discountAmount = this.discountAmount;
      } else if (this.discountType === 'percentage' && this.discountPercentage) {
        payload.discountPercentage = this.discountPercentage;
        if (this.maxDiscountAmount) {
          payload.maxDiscountAmount = this.maxDiscountAmount;
        }
      }

      // Add optional fields
      if (this.minOrderValue) {
        payload.minOrderValue = this.minOrderValue;
      }

      console.log('[Create Voucher] Payload:', payload);
      await this.svc.create(payload);
      this.success = 'Tạo voucher thành công!';
      this.resetForm();
      await this.loadVouchers();
      
      // Auto-clear success message after 5s
      setTimeout(() => {
        this.success = null;
      }, 5000);
    } catch (err: any) {
      console.error('[Create Voucher] Error:', err);
      this.error = err?.error?.message || err?.message || 'Không tạo được voucher';
      
      // Auto-clear error message after 8s
      setTimeout(() => {
        this.error = null;
      }, 8000);
    } finally {
      this.loading = false;
    }
  }

  confirmDelete(id: string): void {
    this.deletingId = id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  async deleteVoucher(id: string): Promise<void> {
    try {
      await this.svc.remove(id);
      this.success = 'Xóa voucher thành công';
      this.deletingId = null;
      await this.loadVouchers();
      
      // Auto-clear success message
      setTimeout(() => {
        this.success = null;
      }, 5000);
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không thể xóa voucher';
      this.deletingId = null;
      setTimeout(() => this.error = null, 5000);
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  }

  isExpired(voucher: any): boolean {
    const now = new Date();
    const validTo = new Date(voucher.validTo);
    return now > validTo;
  }
}
