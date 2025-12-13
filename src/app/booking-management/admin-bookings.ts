import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingManagementService } from '../services/booking-management.service';
import { BookingsService } from '../services/bookings.service';
import { AuthStateService } from '../services/auth-state.service';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-bookings.html',
  styleUrls: ['./admin-bookings.scss']
})
export class AdminBookingsComponent implements OnInit {
  bookings: any[] = [];
  loading = false;
  error: string | null = null;
  page = 1;
  limit = 12;
  total = 0;
  totalPages = 1;
  pendingAction: string | null = null;
  statusFilter: string = '';
  successMessage: string | null = null;
  
  // Create booking modal
  showCreateModal = false;
  createBookingForm: any = {
    customerPhone: '',
    customerName: '',
    customerEmail: '',
    fieldId: '',
    startTime: '',
    durationMinutes: 60,
    notes: ''
  };
  creatingBooking = false;

  constructor(private mgmt: BookingManagementService, private bookingsSrv: BookingsService, private router: Router, private authState: AuthStateService) {}

  get isAdmin() { return this.authState.isAdmin(); }

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.error = 'Bạn không có quyền truy cập.';
      return;
    }
    this.load();
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      // Use BookingsService.getAdminBookings with status filter
      const res = await this.bookingsSrv.getAdminBookings(this.page, this.limit, this.statusFilter || undefined);
      // backend shape: { data: [], meta: { totalPages, totalItems } }
      this.bookings = res.data || [];
      this.total = res.meta?.totalItems || 0;
      this.totalPages = res.meta?.totalPages || 1;
    } catch (e: any) {
      console.warn('load bookings failed', e);
      this.error = e?.error?.message || e?.message || 'Không tải được danh sách đặt sân.';
    } finally {
      this.loading = false;
    }
  }

  canPrev() { return this.page > 1; }
  canNext() { return this.page * this.limit < (this.total || 0); }

  prev() { if (this.canPrev()) { this.page--; this.load(); } }
  next() { if (this.canNext()) { this.page++; this.load(); } }

  viewBooking(id: string) { this.router.navigate([`/admin/bookings/${id}`]); }

  async doCheckIn(b: any) {
    if (!confirm('Xác nhận check-in booking này?')) return;
    this.pendingAction = `checkin:${b.id}`;
    try {
      await this.bookingsSrv.checkIn(b.id);
      alert('Check-in thành công!');
      await this.load();
    } catch (e: any) { 
      alert(e?.error?.message || e?.message || 'Check-in thất bại'); 
    }
    finally { this.pendingAction = null; }
  }

  async doCancel(b: any) {
    if (!confirm('Xác nhận hủy booking này?')) return;
    this.pendingAction = `cancel:${b.id}`;
    try {
      await this.bookingsSrv.cancel(b.id);
      await this.load();
    } catch (e: any) { alert(e?.error?.message || e?.message || 'Hủy thất bại'); }
    finally { this.pendingAction = null; }
  }

  onStatusFilterChange() {
    this.page = 1;
    this.load();
  }

  openCreateModal() {
    this.showCreateModal = true;
    // Reset form
    this.createBookingForm = {
      customerPhone: '',
      customerName: '',
      customerEmail: '',
      fieldId: '',
      startTime: '',
      durationMinutes: 60,
      notes: ''
    };
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  async submitCreateBooking() {
    this.creatingBooking = true;
    this.error = null;
    
    try {
      const payload = {
        customerPhone: this.createBookingForm.customerPhone,
        customerName: this.createBookingForm.customerName,
        customerEmail: this.createBookingForm.customerEmail || undefined,
        fieldId: this.createBookingForm.fieldId,
        startTime: this.createBookingForm.startTime,
        durationMinutes: Number(this.createBookingForm.durationMinutes),
        notes: this.createBookingForm.notes || undefined
      };
      
      await this.bookingsSrv.createBookingByAdmin(payload);
      this.successMessage = 'Tạo booking thành công!';
      this.closeCreateModal();
      await this.load();
      
      setTimeout(() => {
        this.successMessage = null;
      }, 5000);
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Tạo booking thất bại';
    } finally {
      this.creatingBooking = false;
    }
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING_PAYMENT': 'status-pending',
      'CONFIRMED': 'status-confirmed',
      'CHECKED_IN': 'status-checked-in',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled',
      'EXPIRED': 'status-expired'
    };
    return statusMap[status] || 'status-default';
  }

  getStatusCount(status: string): number {
    return this.bookings.filter(b => (b.status || '').toLowerCase() === status.toLowerCase()).length;
  }

  formatTime(time: string): string {
    if (!time) return '-';
    try {
      const d = new Date(time);
      return d.toLocaleString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return time;
    }
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'PENDING_PAYMENT': 'Chờ thanh toán',
      'CONFIRMED': 'Đã xác nhận',
      'CHECKED_IN': 'Đã check-in',
      'COMPLETED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy',
      'EXPIRED': 'Hết hạn'
    };
    return labelMap[status] || status;
  }

  canCheckIn(booking: any): boolean {
    return booking.status === 'CONFIRMED' || booking.status === 'PENDING_PAYMENT';
  }

  canCancel(booking: any): boolean {
    const cancelableStatuses = ['PENDING_PAYMENT', 'CONFIRMED'];
    return cancelableStatuses.includes(booking.status);
  }

  formatDateTime(isoString: string): string {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.page - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number) {
    this.page = page;
    this.load();
  }
}

