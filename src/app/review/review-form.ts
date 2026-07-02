import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReviewService } from '../services/review.service';
import { IdEncoderService } from '../services/id-encoder.service';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './review-form.html',
  styleUrls: ['./review-form.scss']
})
export class ReviewFormComponent {
  bookingId = '';
  fieldId = '';
  rating = 5;
  comment = '';
  loading = false;
  success: string | null = null;
  error: string | null = null;
  hoveredStar = 0;
  
  // Suggestion tags for quick feedback
  suggestionTags = [
    { id: 1, text: 'Sân đẹp, chất lượng tốt', icon: '⭐', positive: true },
    { id: 2, text: 'Nhân viên nhiệt tình', icon: '👍', positive: true },
    { id: 3, text: 'Giá cả hợp lý', icon: '💰', positive: true },
    { id: 4, text: 'Vị trí thuận tiện', icon: '📍', positive: true },
    { id: 5, text: 'Thái độ nhân viên không tốt', icon: '😠', positive: false },
    { id: 6, text: 'Giao sân không đúng thời gian', icon: '⏰', positive: false },
    { id: 7, text: 'Phục vụ kém', icon: '👎', positive: false },
    { id: 8, text: 'Sân không như hình', icon: '🚫', positive: false },
    { id: 9, text: 'Vệ sinh kém', icon: '🧹', positive: false },
  ];
  selectedTags: number[] = [];

  constructor(
    private review: ReviewService, 
    private route: ActivatedRoute,
    private idEncoder: IdEncoderService  // Service giải mã ID
  ) {
    // Lấy fieldId hoặc bookingId từ URL và giải mã nếu cần
    const encodedFieldId = this.route.snapshot.queryParamMap.get('fieldId');
    const encodedBookingId = this.route.snapshot.queryParamMap.get('bookingId');
    
    this.fieldId = encodedFieldId ? this.idEncoder.decode(encodedFieldId) : '';
    this.bookingId = encodedBookingId ? this.idEncoder.decode(encodedBookingId) : '';
  }

  setRating(star: number) {
    this.rating = star;
  }

  setHoveredStar(star: number) {
    this.hoveredStar = star;
  }

  clearHover() {
    this.hoveredStar = 0;
  }

  getStarClass(star: number): string {
    const activeRating = this.hoveredStar || this.rating;
    return star <= activeRating ? 'text-yellow-400' : 'text-gray-300';
  }

  toggleTag(tagId: number) {
    const index = this.selectedTags.indexOf(tagId);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tagId);
    }
    
    // Auto-append selected tag text to comment
    this.updateCommentFromTags();
  }

  isTagSelected(tagId: number): boolean {
    return this.selectedTags.includes(tagId);
  }

  updateCommentFromTags() {
    const selectedTexts = this.suggestionTags
      .filter(tag => this.selectedTags.includes(tag.id))
      .map(tag => tag.text);
    
    // Keep manual comment, just add tags as prefix
    const manualComment = this.comment.split('\n\n---\n').pop() || '';
    if (selectedTexts.length > 0) {
      this.comment = selectedTexts.join(', ') + (manualComment ? '\n\n---\n' + manualComment : '');
    } else {
      this.comment = manualComment;
    }
  }

  async submit(){
    this.loading = true; this.error = null; this.success = null;
    try{
      const payload: any = { rating: Number(this.rating) };
      if (this.bookingId) payload.bookingId = this.bookingId;
      if (this.comment) payload.comment = this.comment;
      const res = await this.review.createReview(payload);
      this.success = 'Gửi đánh giá thành công! Cảm ơn bạn đã đánh giá.';
      this.comment = '';
      this.selectedTags = [];
      this.rating = 5;
    }catch(e: any){
      this.error = (e?.error?.message) || e?.message || 'Gửi đánh giá thất bại';
    }finally{ this.loading = false; }
  }
}
