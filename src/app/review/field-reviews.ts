import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
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
      
      this.calculateStats();
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không thể tải đánh giá';
    } finally {
      this.loading = false;
    }
  }

  calculateStats(): void {
    if (this.reviews.length === 0) {
      this.averageRating = 0;
      this.totalReviews = 0;
      return;
    }

    // Calculate average
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = sum / this.reviews.length;
    this.totalReviews = this.total;

    // Calculate distribution
    this.ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    this.reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        this.ratingDistribution[review.rating]++;
      }
    });
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
    return (this.ratingDistribution[rating] / this.reviews.length) * 100;
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
