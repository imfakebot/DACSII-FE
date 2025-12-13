import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../services/payment.service';
import { BookingsService } from '../services/bookings.service';
import { BranchesService, Branch } from '../services/branches.service';

interface RevenueData {
  month: number;
  revenue: number;
}

interface StatsOverview {
  revenue: number;
  transactions: Record<string, number>;
}

interface RecentBooking {
  id: string;
  customerName?: string;
  fieldName: string;
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
  // Stats
  stats: StatsOverview | null = null;
  statsLoading = false;
  statsError: string | null = null;

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

  // Occupancy rate (mock data for now)
  occupancyRate = 0;
  occupancyLoading = false;

  // Filters
  branches: Branch[] = [];
  selectedBranchId = '';
  startDate = '';
  endDate = '';

  // Chart dimensions
  chartWidth = 800;
  chartHeight = 300;
  chartPadding = { top: 20, right: 20, bottom: 40, left: 60 };

  constructor(
    private paymentService: PaymentService,
    private bookingsService: BookingsService,
    private branchService: BranchesService
  ) {}

  async ngOnInit() {
    await this.loadBranches();
    await Promise.all([
      this.loadStats(),
      this.loadRevenueChart(),
      this.loadRecentBookings(),
      this.loadOccupancyRate()
    ]);
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
   * Load overview statistics (revenue + transactions)
   */
  async loadStats() {
    this.statsLoading = true;
    this.statsError = null;
    try {
      this.stats = await this.paymentService.getAdminStats(
        this.startDate || undefined,
        this.endDate || undefined,
        this.selectedBranchId || undefined
      );
    } catch (error: any) {
      console.error('[Dashboard] Failed to load stats:', error);
      this.statsError = error?.error?.message || 'Không tải được thống kê';
      // Fallback to mock data
      this.stats = {
        revenue: 15750000,
        transactions: {
          COMPLETED: 45,
          PENDING: 12,
          FAILED: 3
        }
      };
    } finally {
      this.statsLoading = false;
    }
  }

  /**
   * Load revenue chart data for current year
   */
  async loadRevenueChart() {
    this.revenueLoading = true;
    this.revenueError = null;
    try {
      const data = await this.paymentService.getRevenueChart(
        this.revenueYear,
        this.selectedBranchId || undefined
      );
      
      // Fill missing months with 0
      this.revenueData = [];
      for (let i = 1; i <= 12; i++) {
        const monthData = data.find((d: any) => d.month === i);
        this.revenueData.push({
          month: i,
          revenue: monthData ? monthData.revenue : 0
        });
      }
    } catch (error: any) {
      console.error('[Dashboard] Failed to load revenue chart:', error);
      this.revenueError = error?.error?.message || 'Không tải được biểu đồ doanh thu';
      // Fallback to mock data
      this.revenueData = [
        { month: 1, revenue: 1200000 },
        { month: 2, revenue: 1500000 },
        { month: 3, revenue: 1800000 },
        { month: 4, revenue: 1600000 },
        { month: 5, revenue: 2100000 },
        { month: 6, revenue: 2400000 },
        { month: 7, revenue: 2200000 },
        { month: 8, revenue: 2600000 },
        { month: 9, revenue: 2300000 },
        { month: 10, revenue: 2700000 },
        { month: 11, revenue: 2500000 },
        { month: 12, revenue: 2900000 }
      ];
    } finally {
      this.revenueLoading = false;
    }
  }

  /**
   * Load recent bookings (last 10)
   */
  async loadRecentBookings() {
    this.bookingsLoading = true;
    this.bookingsError = null;
    try {
      const response = await this.bookingsService.getAdminBookings(1, 10); // First page, 10 items
      this.recentBookings = response.data.map((booking: any) => ({
        id: booking.id,
        customerName: booking.userProfile?.fullName || booking.userProfile?.email || 'Khách hàng',
        fieldName: booking.field?.name || 'Sân chưa rõ',
        startTime: booking.startTime,
        duration: booking.durationMinutes,
        totalAmount: booking.payment?.finalAmount || 0,
        status: booking.status
      }));
    } catch (error: any) {
      console.error('[Dashboard] Failed to load recent bookings:', error);
      this.bookingsError = error?.error?.message || 'Không tải được danh sách booking';
      // Fallback to mock data
      this.recentBookings = [
        {
          id: '1',
          customerName: 'Nguyễn Văn A',
          fieldName: 'Sân A1',
          startTime: new Date().toISOString(),
          duration: 90,
          totalAmount: 300000,
          status: 'CONFIRMED'
        },
        {
          id: '2',
          customerName: 'Trần Thị B',
          fieldName: 'Sân B2',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          duration: 60,
          totalAmount: 200000,
          status: 'COMPLETED'
        },
        {
          id: '3',
          customerName: 'Lê Văn C',
          fieldName: 'Sân C3',
          startTime: new Date(Date.now() - 7200000).toISOString(),
          duration: 120,
          totalAmount: 400000,
          status: 'PENDING'
        }
      ];
    } finally {
      this.bookingsLoading = false;
    }
  }

  /**
   * Load occupancy rate (mock data - backend doesn't have this API yet)
   */
  async loadOccupancyRate() {
    this.occupancyLoading = true;
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock calculation: random between 60-85%
    this.occupancyRate = Math.floor(Math.random() * 25) + 60;
    this.occupancyLoading = false;
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
   * Get total transactions count
   */
  getTotalTransactions(): number {
    if (!this.stats?.transactions) return 0;
    return Object.values(this.stats.transactions).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Change revenue chart year
   */
  async changeYear(delta: number) {
    this.revenueYear += delta;
    await this.loadRevenueChart();
  }

  /**
   * Apply filters and reload all data
   */
  async applyFilters() {
    await Promise.all([
      this.loadStats(),
      this.loadRevenueChart(),
      this.loadRecentBookings()
    ]);
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.selectedBranchId = '';
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }
}
