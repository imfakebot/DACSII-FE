import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReviewService, ReviewDto, PaginatedReviewResponse } from '../services/review.service';

@Component({
  selector: 'app-field-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './field-reviews.html',
  styleUrl: './field-reviews.scss',
})
export class FieldReviewsComponent implements OnInit {
  @Input() fieldId!: string;
  @Output() statsChange = new EventEmitter<{ averageRating: number | null; totalReviews: number }>();
  
  reviews: ReviewDto[] = [];
  loading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 10;
  
  // Stats
  averageRating = 0;
  totalReviews = 0;
  ratingDistribution: { [key: number]: number } = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0
  };

  // Expose Math to template
  Math = Math;

  constructor(private svc: ReviewService) {}

  async ngOnInit(): Promise<void> {
    if (this.fieldId) {
      await this.loadReviews();
    }
  }

  async loadReviews(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      const response: PaginatedReviewResponse = await this.svc.getReviewsByField(
        this.fieldId, 
        this.currentPage, 
        this.limit
      );
      
      this.reviews = response.data || [];
      this.total = response.total || 0;
      this.totalPages = Math.ceil(this.total / this.limit);

      // If backend provided an overall averageRating, prefer it for header display.
      if (typeof response.averageRating === 'number' && response.averageRating > 0) {
        this.averageRating = response.averageRating;
      }

      this.calculateStats();
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không thể tải đánh giá';
    } finally {
      this.loading = false;
    }
  }

  calculateStats(): void {
    // Use backend total if available (supports pagination), otherwise fallback to current page length
    this.totalReviews = this.total && this.total > 0 ? this.total : this.reviews.length;

    // Reset distribution
    this.ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (this.reviews.length === 0) {
      // No items on this page. If backend provided an overall average (set earlier in loadReviews),
      // preserve it and synthesize a simple distribution so the bars can render in the UI.
      if (this.averageRating && this.averageRating > 0 && this.totalReviews > 0) {
        const rounded = Math.min(5, Math.max(1, Math.round(this.averageRating)));
        this.ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        this.ratingDistribution[rounded] = this.totalReviews;
        try { this.statsChange.emit({ averageRating: this.averageRating, totalReviews: this.totalReviews }); } catch (e) {}
      } else {
        // No backend average either — keep average at 0 and emit null so parent does not overwrite
        this.averageRating = 0;
        try { this.statsChange.emit({ averageRating: null, totalReviews: this.totalReviews }); } catch (e) {}
      }
      return;
    }

    // Calculate average from available page items
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = sum / this.reviews.length;

    // Calculate distribution from page items
    this.reviews.forEach(review => {
      const r = Number(review.rating) || 0;
      if (r >= 1 && r <= 5) {
        this.ratingDistribution[r] = (this.ratingDistribution[r] || 0) + 1;
      }
    });

    // Notify parent (detail page) about updated stats so header can reflect current values
    try { this.statsChange.emit({ averageRating: this.averageRating, totalReviews: this.totalReviews }); } catch (e) {}
  }

  async nextPage(): Promise<void> {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.loadReviews();
    }
  }

  async previousPage(): Promise<void> {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.loadReviews();
    }
  }

  async goToPage(page: number): Promise<void> {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      await this.loadReviews();
    }
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, index) => index < rating);
  }

  getRatingPercentage(rating: number): number {
    if (this.totalReviews === 0) return 0;
    // Use totalReviews as denominator so bar reflects overall distribution (when backend supplies total)
    return (this.ratingDistribution[rating] / this.totalReviews) * 100;
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRelativeTime(date: any): string {
    if (!date) return '';
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
    return `${Math.floor(diffDays / 365)} năm trước`;
  }
}
