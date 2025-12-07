import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReviewAdminService } from '../services/review-admin.service';
import { ReviewDto } from '../services/review.service';

@Component({
  selector: 'app-admin-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-review.html',
  styleUrl: './admin-review.scss',
})
export class AdminReviewComponent implements OnInit {
  reviews: ReviewDto[] = [];
  filteredReviews: ReviewDto[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  total = 0;
  limit = 20;
  
  // Filters
  ratingFilter: number | null = null;
  searchQuery = '';
  
  // Delete confirmation
  deletingId: string | null = null;
  deleteLoading = false;

  constructor(private svc: ReviewAdminService) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      const res = await this.svc.getAll(this.currentPage, this.limit);
      this.reviews = res?.data ?? [];
      this.total = res?.total ?? 0;
      this.totalPages = Math.ceil(this.total / this.limit);
      this.applyFilters();
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không tải được reviews';
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    let results = [...this.reviews];
    
    // Rating filter
    if (this.ratingFilter !== null) {
      results = results.filter(r => r.rating === this.ratingFilter);
    }
    
    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      results = results.filter(r => 
        r.user?.full_name?.toLowerCase().includes(query) ||
        r.user?.email?.toLowerCase().includes(query) ||
        r.comment?.toLowerCase().includes(query) ||
        r.field?.name?.toLowerCase().includes(query)
      );
    }
    
    this.filteredReviews = results;
  }

  onRatingFilterChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.ratingFilter = null;
    this.searchQuery = '';
    this.applyFilters();
  }

  confirmDelete(id: string): void {
    this.deletingId = id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  async deleteReview(id: string): Promise<void> {
    this.deleteLoading = true;
    this.error = null;
    
    try {
      await this.svc.deleteReview(id);
      this.successMessage = 'Đã xóa đánh giá thành công!';
      this.deletingId = null;
      
      // Reload list
      setTimeout(() => {
        this.successMessage = null;
        this.load();
      }, 2000);
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không thể xóa đánh giá';
      this.deletingId = null;
    } finally {
      this.deleteLoading = false;
    }
  }

  async nextPage(): Promise<void> {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      await this.load();
    }
  }

  async previousPage(): Promise<void> {
    if (this.currentPage > 1) {
      this.currentPage--;
      await this.load();
    }
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, index) => index < rating);
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleString('vi-VN', {
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
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return this.formatDate(date);
  }
}
