import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../services/payment.service';
import { BookingsService } from '../services/bookings.service';
import { BranchesService, Branch } from '../services/branches.service';
import { AuthStateService } from '../services/auth-state.service';

interface RevenueData {
  month: number;
  revenue: number;
}

interface RecentBooking {
  id: string;
  code: string;
  customerName: string;
  customerEmail?: string;
  fieldName: string;
  branchName?: string;
  startTime: string;
  duration: number;
  totalAmount: number;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  // Stats - tính từ biểu đồ để đảm bảo khớp
  totalRevenue = 0;
  totalTransactions = 0;
  transactionsByStatus: Record<string, number> = {};
  statsLoading = false;

  // Revenue chart
  revenueData: RevenueData[] = [];
  revenueYear = new Date().getFullYear();
  currentYear = new Date().getFullYear();
  revenueLoading = false;
  revenueError: string | null = null;

  // Recent bookings
  recentBookings: RecentBooking[] = [];
  bookingsLoading = false;
  bookingsError: string | null = null;

  // Branch filter
  branches: Branch[] = [];
  selectedBranchId = '';
  canSelectBranch = false; // Chỉ admin mới được chọn branch khác
  userBranchId: string | null = null; // Branch của user hiện tại
  
  // Permission flags
  canViewRevenue = false; // Chỉ admin và manager mới xem được doanh thu
  isStaff = false;

  // Chart dimensions
  chartWidth = 800;
  chartHeight = 300;
  chartPadding = { top: 20, right: 20, bottom: 40, left: 60 };

  constructor(
    private paymentService: PaymentService,
    private bookingsService: BookingsService,
    private branchService: BranchesService,
    private authState: AuthStateService
  ) {}

  async ngOnInit() {
    // Kiểm tra quyền và branch
    this.canSelectBranch = this.authState.isAdmin();
    this.canViewRevenue = this.authState.canViewRevenue(); // Chỉ admin và manager
    this.isStaff = this.authState.isStaff();
    this.userBranchId = this.authState.getUserBranchId();
    
    // Nếu là branch_manager hoặc staff, tự động filter theo branch của họ
    if (this.userBranchId && !this.canSelectBranch) {
      this.selectedBranchId = this.userBranchId;
    }
    
    await this.loadBranches();
    
    // Chỉ load revenue chart và stats nếu có quyền (admin/manager)
    if (this.canViewRevenue) {
      await this.loadRevenueChart();
      await this.loadStatsFromAPI();
    }
    
    // Load recent bookings cho tất cả roles
    await this.loadRecentBookings();
  }

  /**
   * Load branches for filter dropdown
   */
  async loadBranches() {
    try {
      this.branches = await this.branchService.listBranches();
    } catch (err) {
      console.warn('[Dashboard] Failed to load branches', err);
    }
  }

  /**
   * Load revenue chart data
   * Biểu đồ hiển thị doanh thu theo tháng của năm được chọn
   */
  async loadRevenueChart() {
    this.revenueLoading = true;
    this.revenueError = null;
    try {
      const data = await this.paymentService.getRevenueChart(
        this.revenueYear,
        this.selectedBranchId || undefined
      );
      
      console.log('[Dashboard] Revenue chart API response:', data);
      
      // Fill missing months with 0
      this.revenueData = [];
      for (let i = 1; i <= 12; i++) {
        const monthData = data.find((d: any) => d.month === i);
        this.revenueData.push({
          month: i,
          revenue: monthData ? Number(monthData.revenue) : 0
        });
      }
      
      // Tính tổng doanh thu từ biểu đồ
      this.totalRevenue = this.revenueData.reduce((sum, item) => sum + item.revenue, 0);
      
      console.log('[Dashboard] Revenue data:', this.revenueData);
      console.log('[Dashboard] Total revenue from chart:', this.totalRevenue);
    } catch (error: any) {
      console.error('[Dashboard] Failed to load revenue chart:', error);
      this.revenueError = error?.error?.message || 'Không tải được biểu đồ doanh thu';
      this.revenueData = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0 }));
      this.totalRevenue = 0;
    } finally {
      this.revenueLoading = false;
    }
  }

  /**
   * Load transaction stats từ API
   * Lấy số lượng giao dịch theo trạng thái của năm hiện tại
   */
  async loadStatsFromAPI() {
    this.statsLoading = true;
    try {
      // Lấy stats cho cả năm hiện tại
      const startOfYear = `${this.revenueYear}-01-01`;
      const endOfYear = `${this.revenueYear}-12-31`;
      
      const stats = await this.paymentService.getAdminStats(
        startOfYear,
        endOfYear,
        this.selectedBranchId || undefined
      );
      
      console.log('[Dashboard] Stats API response:', stats);
      
      // Lấy transactions breakdown (lowercase từ BE)
      this.transactionsByStatus = stats?.transactions || {};
      this.totalTransactions = Object.values(this.transactionsByStatus).reduce((sum, count) => sum + count, 0);
      
      console.log('[Dashboard] Transactions by status:', this.transactionsByStatus);
      console.log('[Dashboard] Total transactions:', this.totalTransactions);
    } catch (error) {
      console.error('[Dashboard] Failed to load stats:', error);
      this.transactionsByStatus = {};
      this.totalTransactions = 0;
    } finally {
      this.statsLoading = false;
    }
  }

  /**
   * Load recent bookings (last 10)
   */
  async loadRecentBookings() {
    this.bookingsLoading = true;
    this.bookingsError = null;
    try {
      const response = await this.bookingsService.getAdminBookings(1, 10);
      console.log('[Dashboard] Bookings API response:', response);
      
      this.recentBookings = (response.data || []).map((booking: any) => {
        // Tính duration từ start_time và end_time
        let duration = 0;
        const startTime = booking.start_time || booking.startTime;
        const endTime = booking.end_time || booking.endTime;
        
        if (startTime && endTime) {
          const start = new Date(startTime);
          const end = new Date(endTime);
          duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        }
        
        return {
          id: booking.id,
          code: booking.code || `BK-${(booking.id || '').substring(0, 8).toUpperCase()}`,
          customerName: booking.userProfile?.fullName || booking.userProfile?.full_name || booking.customerName || 'Khách hàng',
          customerEmail: booking.userProfile?.email || '',
          fieldName: booking.field?.name || 'Sân chưa rõ',
          branchName: booking.field?.branch?.name || '',
          startTime: startTime,
          duration: duration,
          totalAmount: booking.payment?.finalAmount || booking.payment?.final_amount || booking.total_price || 0,
          status: booking.status
        };
      });
      
      console.log('[Dashboard] Mapped bookings:', this.recentBookings);
    } catch (error: any) {
      console.error('[Dashboard] Failed to load bookings:', error);
      this.bookingsError = error?.error?.message || 'Không tải được danh sách booking';
      this.recentBookings = [];
    } finally {
      this.bookingsLoading = false;
    }
  }

  /**
   * Get month name from number
   */
  getMonthName(month: number): string {
    const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    return months[month - 1] || '';
  }

  /**
   * Calculate chart coordinates for revenue bar chart
   */
  getBarChartData() {
    const innerWidth = this.chartWidth - this.chartPadding.left - this.chartPadding.right;
    const innerHeight = this.chartHeight - this.chartPadding.top - this.chartPadding.bottom;
    
    const maxRevenue = Math.max(...this.revenueData.map(d => d.revenue), 1);
    const barWidth = innerWidth / this.revenueData.length;
    const barSpacing = barWidth * 0.2;
    const actualBarWidth = barWidth - barSpacing;

    return this.revenueData.map((data, index) => {
      const barHeight = (data.revenue / maxRevenue) * innerHeight;
      const x = this.chartPadding.left + index * barWidth + barSpacing / 2;
      const y = this.chartPadding.top + innerHeight - barHeight;

      return {
        x,
        y,
        width: actualBarWidth,
        height: barHeight,
        label: this.getMonthName(data.month),
        value: data.revenue,
        labelX: x + actualBarWidth / 2,
        labelY: this.chartHeight - this.chartPadding.bottom + 20
      };
    });
  }

  /**
   * Format currency (VND)
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format compact currency (e.g., 1.5M instead of 1,500,000đ)
   */
  formatCompactCurrency(amount: number): string {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + 'K';
    }
    return amount.toString();
  }

  /**
   * Format datetime
   */
  formatDateTime(isoString: string): string {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Chờ xử lý',
      CONFIRMED: 'Đã xác nhận',
      CHECKED_IN: 'Đã check-in',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      NO_SHOW: 'Không đến'
    };
    return labels[status] || status;
  }

  /**
   * Get status class for styling
   */
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'status-pending',
      CONFIRMED: 'status-confirmed',
      CHECKED_IN: 'status-checked-in',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
      NO_SHOW: 'status-no-show'
    };
    return classes[status] || 'status-default';
  }

  /**
   * Get transaction count by status (lowercase key from BE)
   */
  getTransactionCount(status: string): number {
    return this.transactionsByStatus[status] || 0;
  }

  /**
   * Change revenue chart year và reload tất cả
   */
  async changeYear(delta: number) {
    this.revenueYear += delta;
    await this.loadRevenueChart();
    await this.loadStatsFromAPI();
  }

  /**
   * Apply branch filter
   */
  async applyBranchFilter() {
    console.log('[Dashboard] Applying branch filter:', this.selectedBranchId);
    await this.loadRevenueChart();
    await Promise.all([
      this.loadStatsFromAPI(),
      this.loadRecentBookings()
    ]);
  }

  /**
   * Clear branch filter
   */
  async clearBranchFilter() {
    this.selectedBranchId = '';
    await this.applyBranchFilter();
  }
}
