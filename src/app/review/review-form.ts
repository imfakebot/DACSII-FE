import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReviewService } from '../services/review.service';

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

  constructor(private review: ReviewService, private route: ActivatedRoute) {
    // If route provides fieldId or bookingId, use them
    this.fieldId = this.route.snapshot.queryParamMap.get('fieldId') || '';
    this.bookingId = this.route.snapshot.queryParamMap.get('bookingId') || '';
  }

  async submit(){
    this.loading = true; this.error = null; this.success = null;
    try{
      const payload: any = { rating: Number(this.rating) };
      if (this.bookingId) payload.bookingId = this.bookingId;
      if (this.comment) payload.comment = this.comment;
      const res = await this.review.createReview(payload);
      this.success = 'Gửi đánh giá thành công';
      this.comment = '';
    }catch(e: any){
      this.error = (e?.error?.message) || e?.message || 'Gửi đánh giá thất bại';
    }finally{ this.loading = false; }
  }
}
