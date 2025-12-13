import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field } from '../services/fields.service';
import { PricingService, CheckPriceResponseDto } from '../services/pricing.service';
import { BookingsService, BookingResponse, CreateBookingDto } from '../services/bookings.service';
import { AuthStateService } from '../services/auth-state.service';
import { FieldReviewsComponent } from '../review/field-reviews';

/*
  DetailComponent (Tiếng Việt):
  - Hiển thị thông tin chi tiết một sân
  - Dùng layout `.container` và `.actions` đã có trong `app.scss`
*/
@Component({
  selector: 'field-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FieldReviewsComponent],
  templateUrl: './detail.html',
  styleUrls: ['./detail.scss']
})
export class DetailComponent implements OnInit, OnDestroy {
  field: Field | null = null;
  // Booking form state
  // Do not prefill date/time/duration — user should choose.
  date: string = '';
  time: string = '';
  // split time parts for half-hour enforcement
  timeHour: number | null = null;
  timeMinute: string | null = null;
  hours: number[] = Array.from({ length: 24 }, (_, i) => i);
  duration: number | null = null;
  voucherCode: string = '';
  pricing: CheckPriceResponseDto | null = null;
  pricingError: string | null = null;
  bookingMessage: string | null = null;
  bookingError: string | null = null;
  paymentUrl: string | null = null;
  checkingAvailability = false;
  pricingPending = false;
  // schedule visualization - optimized to fetch all bookings in one call
  slots: Array<{ timeLabel: string; iso: string; available: boolean; selected?: boolean }> = [];
  scheduleLoading = false;
  scheduleError: string | null = null;
  // booking creation state
  creatingBooking = false;
  lastScheduleUpdate: Date | null = null;
  private autoCheckHandle: ReturnType<typeof setTimeout> | null = null;
  private pendingRecheck = false;
  private scheduleRefreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fieldsService: FieldsService,
    private pricingService: PricingService,
    private bookingsService: BookingsService,
    public authState: AuthStateService,
  ) {}

  async ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id');
    if(!id){
      this.pricingError = 'Không tìm thấy mã sân được yêu cầu.';
      return;
    }
    try{
      this.field = await this.fieldsService.getFieldById(id);
      // Set default date to today
      this.date = new Date().toISOString().split('T')[0];
      this.onDateChange(); // Load schedule for today
    }catch(error: any){
      console.warn('[DetailComponent] load field failed', error);
      this.pricingError = error?.error?.message || 'Không tải được thông tin sân.';
      return;
    }
  }

  onTimePartChange(){
    if (this.timeHour === null || this.timeMinute === null) {
      this.time = '';
    } else {
      const hh = (`${this.timeHour}`).padStart(2, '0');
      const mm = this.timeMinute;
      this.time = `${hh}:${mm}`;
    }
    // We don't need to re-fetch schedule on time change, just maybe validate
  }



  async submitBooking() {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (!this.field || !this.date || !this.time || !this.duration) {
      this.bookingError = 'Vui lòng chọn đầy đủ thông tin: Ngày, Giờ, Thời lượng.';
      return;
    }

    // Build ISO start time
    const startIso = this.buildIsoStart();
    if (!startIso) {
      this.bookingError = 'Ngày giờ không hợp lệ. Vui lòng kiểm tra lại.';
      return;
    }

    // Validate future time
    const startDate = new Date(startIso);
    if (startDate.getTime() <= Date.now()) {
      this.bookingError = 'Vui lòng chọn khung giờ ở tương lai.';
      return;
    }

    this.creatingBooking = true;
    this.bookingError = null;
    this.bookingMessage = null;

    try {
      const payload: CreateBookingDto = {
        fieldId: this.field.id,
        startTime: startIso,
        durationMinutes: this.duration,
      };

      if (this.voucherCode && this.voucherCode.trim()) {
        payload.voucherCode = this.voucherCode.trim();
      }

      const res = await this.bookingsService.create(payload);

      this.bookingMessage = res.message || 'Đặt sân thành công!';

      // Refresh schedule to show newly booked slot
      if (this.date) {
        await this.loadDailySchedule(this.date);
      }

      // Redirect to payment if URL exists
      if (res.paymentUrl) {
        this.bookingMessage += ' Đang chuyển đến trang thanh toán...';
        setTimeout(() => {
          window.location.href = res.paymentUrl;
        }, 1500);
      } else {
        // No payment URL - maybe admin created booking or other scenario
        this.router.navigate(['/my-bookings']);
      }
    } catch (err: any) {
      console.error('[DetailComponent] Booking error:', err);

      if (err.status === 401) {
        this.bookingError = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        this.authState.setUser(null);
        setTimeout(() => this.router.navigate(['/login']), 1500);
      } else if (err.status === 409) {
        this.bookingError = 'Khung giờ này đã có người đặt trước. Vui lòng chọn khung giờ khác.';
        // Refresh schedule immediately
        this.pricing = null;
        if (this.date) {
          await this.loadDailySchedule(this.date);
        }
      } else if (err.status === 400) {
        this.bookingError = err.message || 'Dữ liệu không hợp lệ (voucher sai, thời gian không hợp lệ...).';
      } else if (err.status === 404) {
        this.bookingError = err.message || 'Không tìm thấy sân hoặc thông tin người dùng.';
      } else {
        this.bookingError = err.message || 'Đặt sân thất bại. Vui lòng thử lại.';
      }
    } finally {
      this.creatingBooking = false;
    }
  }

  ngOnDestroy(): void {
    if (this.autoCheckHandle) {
      clearTimeout(this.autoCheckHandle);
      this.autoCheckHandle = null;
    }
    this.stopScheduleAutoRefresh();
  }

  goBack(){ this.router.navigate(['/football']); }
  
  get isLoggedIn(){ return this.authState.isLoggedIn(); }

  get hasToken(): boolean {
    return !!localStorage.getItem('accessToken');
  }
  
  get tokenPreview(): string {
    const token = localStorage.getItem('accessToken');
    return token ? token.substring(0, 30) + '...' : 'No token';
  }

  private buildIsoStart(): string | null {
    if(!this.date || !this.time) return null;
    const candidate = new Date(`${this.date}T${this.time}`);
    if(Number.isNaN(candidate.getTime())) return null;
    return candidate.toISOString();
  }

  async checkAvailability(){
    if(this.checkingAvailability){
      this.pendingRecheck = true;
      return;
    }
    this.pricingError = null; this.bookingMessage = null; this.bookingError = null;
    if(!this.field){ this.pricingError = 'Thiếu thông tin sân'; return; }
    const startIso = this.buildIsoStart();
    if(!startIso){ this.pricingError = 'Vui lòng chọn ngày và giờ bắt đầu'; return; }
    if(!this.duration || this.duration < 30){ this.pricingError = 'Vui lòng nhập thời lượng (tối thiểu 30 phút)'; return; }
    const startDate = new Date(startIso);
    if(startDate.getTime() <= Date.now()){
      this.pricingError = 'Vui lòng chọn khung giờ ở tương lai.';
      return;
    }
    this.checkingAvailability = true;
    this.pricingPending = true;
    try{
      this.pricing = await this.pricingService.checkAvailability({ fieldId: this.field.id, startTime: startIso, durationMinutes: this.duration });
      
      // Refresh schedule grid sau khi check để cập nhật trạng thái slots
      if (this.date) {
        await this.loadDailySchedule(this.date);
      }
    }catch(e: any){
      this.pricingError = (e?.error?.message) || e?.message || 'Không kiểm tra được giá/khả dụng';
    }finally{
      this.checkingAvailability = false;
      this.pricingPending = false;
      const shouldRecheck = this.pendingRecheck;
      this.pendingRecheck = false;
      if(shouldRecheck){
        this.checkAvailability();
      }
    }
  }

  /**
   * Mark all slots that will be affected by the booking duration
   */
  private markAffectedSlots(startIso: string, durationMinutes: number) {
    if (!this.slots || this.slots.length === 0) return;
    
    const startTime = new Date(startIso).getTime();
    const endTime = startTime + durationMinutes * 60 * 1000;
    
    // Clear previous selections first
    this.slots.forEach(s => s.selected = false);
    
    // Mark all slots that fall within the booking duration
    this.slots.forEach(slot => {
      const slotStart = new Date(slot.iso).getTime();
      const slotEnd = slotStart + 30 * 60 * 1000;
      
      // Slot is affected if it overlaps with booking duration
      const isAffected = slotStart < endTime && slotEnd > startTime;
      if (isAffected) {
        slot.selected = true;
      }
    });
  }

  private bootstrapInitialSchedule(){
    const nextSlot = new Date();
    nextSlot.setMinutes(0,0,0);
    nextSlot.setHours(nextSlot.getHours() + 2);
    const month = `${nextSlot.getMonth() + 1}`.padStart(2, '0');
    const day = `${nextSlot.getDate()}`.padStart(2, '0');
    const hours = `${nextSlot.getHours()}`.padStart(2, '0');
    const mins = `${nextSlot.getMinutes()}`.padStart(2, '0');
    this.date = `${nextSlot.getFullYear()}-${month}-${day}`;
    this.time = `${hours}:${mins}`;
  }

  onScheduleChange(){
    // Mark affected slots immediately when duration changes
    if (this.duration && this.date && this.time) {
      const startIso = new Date(`${this.date}T${this.time}:00`).toISOString();
      if (!isNaN(new Date(startIso).getTime())) {
        this.markAffectedSlots(startIso, this.duration);
      }
    }
    
    if(this.autoCheckHandle){
      clearTimeout(this.autoCheckHandle);
    }
    this.autoCheckHandle = setTimeout(() => {
      this.autoCheckHandle = null;
      this.checkAvailability();
    }, 400);
  }

  /**
   * Load daily schedule for the selected date (optimized: single API call)
   * Generates 32 slots from 06:00 to 22:00 (30-minute intervals)
   * Marks slots as available/booked based on backend response
   */
  async loadDailySchedule(date: string) {
    if (!this.field || !date) return;
    this.scheduleLoading = true;
    this.scheduleError = null;
    this.slots = [];

    try {
      // Fetch all bookings for this field on this date in ONE API call
      const response = await this.bookingsService.getFieldSchedule(this.field.id, date);
      const bookings = response?.bookings || [];

      // Generate 32 time slots from 06:00 to 22:00 (30-minute intervals)
      // IMPORTANT: Create slots in LOCAL TIME but store as ISO (UTC) for backend compatibility
      const slots: Array<{ timeLabel: string; iso: string; available: boolean; selected?: boolean }> = [];
      for (let hour = 6; hour < 22; hour++) {
        for (let minute of [0, 30]) {
          const hh = (`${hour}`).padStart(2, '0');
          const mm = (`${minute}`).padStart(2, '0');
          const timeLabel = `${hh}:${mm}`;
          
          // Create date in local timezone (user's perspective)
          const slotDate = new Date(`${date}T${timeLabel}:00`);
          const slotIso = slotDate.toISOString();
          
          // Convert to timestamps for comparison (both in UTC milliseconds)
          const slotStart = slotDate.getTime();
          const slotEnd = slotStart + 30 * 60 * 1000; // 30 minutes

          // Check if this slot overlaps with any booking
          // Backend returns UTC ISO strings, Date constructor parses them correctly
          const isBooked = bookings.some((b: any) => {
            const bookingStart = new Date(b.startTime).getTime();
            const bookingEnd = new Date(b.endTime).getTime();
            // Slot is booked if there's any overlap: (StartA < EndB) && (EndA > StartB)
            return bookingStart < slotEnd && bookingEnd > slotStart;
          });

          slots.push({
            timeLabel,
            iso: slotIso,
            available: !isBooked,
          });
        }
      }
      this.slots = slots;
      this.lastScheduleUpdate = new Date();
    } catch (error: any) {
      console.warn('[DetailComponent] loadDailySchedule failed', error);
      this.scheduleError = error?.error?.message || error?.message || 'Không tải được lịch đặt sân';
    } finally {
      this.scheduleLoading = false;
    }
  }

  /**
   * Handle date change: reload schedule for new date
   */
  // onDateChange() {
  //   if (this.date && this.field) {
  //     this.loadDailySchedule(this.date);
  //     this.startScheduleAutoRefresh();
  //   } else {
  //     this.stopScheduleAutoRefresh();
  //   }
  // }
  /**
   * Handle date change: reload schedule for new date
   */
  onDateChange() {
    if (this.date && this.field) {
      this.loadDailySchedule(this.date);
      this.startScheduleAutoRefresh();
    } else {
      this.stopScheduleAutoRefresh();
    }
  }

  /**
   * Bắt đầu auto-refresh schedule mỗi 5 giây
   */
  private startScheduleAutoRefresh() {
    // Clear existing interval
    this.stopScheduleAutoRefresh();
    
    // Refresh mỗi 5 giây
    this.scheduleRefreshInterval = setInterval(() => {
      if (this.date && this.field) {
        console.log('[ScheduleRefresh] Auto-refreshing schedule...');
        this.loadDailySchedule(this.date);
      }
    }, 5000);
  }

  /**
   * Dừng auto-refresh schedule
   */
  private stopScheduleAutoRefresh() {
    if (this.scheduleRefreshInterval) {
      clearInterval(this.scheduleRefreshInterval);
      this.scheduleRefreshInterval = null;
    }
  }

  /**
   * User clicks on an available slot: populate form with slot time
   */
  selectSlot(slot: any) {
    if (!slot.available) return; // Can't select booked slots
    
    // Parse slot time and populate form
    const slotDate = new Date(slot.iso);
    const hh = slotDate.getHours();
    const mm = slotDate.getMinutes();
    this.timeHour = hh;
    this.timeMinute = mm === 0 ? '00' : '30';
    this.onTimePartChange();
    
    // Set default duration if not already set
    if (!this.duration) {
      this.duration = 60; // Default 1 hour
    }
    
    // Mark all affected slots based on duration
    this.markAffectedSlots(slot.iso, this.duration);
  }

  /**
   * Alias for selectSlot - called from HTML template
   */
  onSlotClick(slot: any) {
    this.selectSlot(slot);
  }
}
