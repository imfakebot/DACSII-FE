import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field } from '../services/fields.service';
import { PricingService, CheckPriceResponseDto } from '../services/pricing.service';
import { BookingsService, BookingResponse, CreateBookingDto } from '../services/bookings.service';
import { AuthStateService } from '../services/auth-state.service';
import { FieldReviewsComponent } from '../review/field-reviews';
import { VoucherService, Voucher } from '../services/voucher.service';

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
  // Voucher modal
  showVoucherModal = false;
  availableVouchers: Voucher[] = [];
  loadingVouchers = false;
  selectedVoucher: Voucher | null = null;
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
    private voucherService: VoucherService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  async ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id');
    if(!id){
      this.pricingError = 'Không tìm thấy mã sân được yêu cầu.';
      return;
    }
    try{
      this.field = await this.fieldsService.getFieldById(id);
      // Set duration mặc định ngay khi load để pricing có thể hoạt động
      if (!this.duration) {
        this.duration = 60; // Mặc định 60 phút
        console.log('[ngOnInit] Set default duration: 60 minutes');
      }
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
    // Tự động check giá khi có đủ thông tin
    this.onScheduleChange();
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
    const startDate = new Date(`${this.date}T${this.time}:00`);
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
      console.debug('[DetailComponent] submitBooking payload:', payload);

      if (this.voucherCode && this.voucherCode.trim()) {
        payload.voucherCode = this.voucherCode.trim();
      }

      const res = await this.bookingsService.create(payload);

      this.bookingMessage = res.message || 'Đặt sân thành công!';

      // Persist the newly created booking locally so payment callback can display details
      try {
        if (res && res.booking && typeof window !== 'undefined') {
          const key = `pendingBooking_${(res.booking.id || '').replace(/-/g, '')}`;
          localStorage.setItem(key, JSON.stringify(res.booking));
          // also store by full id for convenience
          const keyFull = `pendingBooking_${res.booking.id}`;
          localStorage.setItem(keyFull, JSON.stringify(res.booking));
        }
      } catch (e) {
        console.warn('[DetailComponent] Failed to persist pending booking to localStorage', e);
      }

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
        if (this.isBrowser()) {
          try { localStorage.removeItem('accessToken'); } catch {}
          try { localStorage.removeItem('refreshToken'); } catch {}
        }
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
    if (!this.isBrowser()) return false;
    try { return !!localStorage.getItem('accessToken'); } catch { return false; }
  }
  
  get tokenPreview(): string {
    if (!this.isBrowser()) return 'No token';
    try {
      const token = localStorage.getItem('accessToken');
      return token ? token.substring(0, 30) + '...' : 'No token';
    } catch { return 'No token'; }
  }

  /**
   * Calculate price per hour based on time slot rules
   * 07:00-12:00: 100,000 VND/hour
   * 12:00-17:00: 80,000 VND/hour  
   * 17:00-21:00: 150,000 VND/hour
   */
  private calculatePricePerHour(timeString: string): number {
    const [hour] = timeString.split(':').map(Number);
    
    if (hour >= 7 && hour < 12) {
      return 100000; // 07:00-11:59
    } else if (hour >= 12 && hour < 17) {
      return 80000;  // 12:00-16:59
    } else if (hour >= 17 && hour < 21) {
      return 150000; // 17:00-20:59
    }
    return 100000; // Default fallback
  }

  /**
   * Get total price - prefer pricing object (with voucher applied) over calculated price
   */
  get estimatedTotal(): number | null {
    // If pricing object exists (with or without voucher), use its total_price
    if (this.pricing && this.pricing.pricing && typeof this.pricing.pricing.total_price === 'number') {
      return this.pricing.pricing.total_price;
    }
    
    // Fallback: calculate from time slots if no pricing object yet
    if (!this.time || !this.duration) return null;
    
    const pricePerHour = this.calculatePricePerHour(this.time);
    const hours = this.duration / 60;
    const total = pricePerHour * hours;
    return Math.ceil(total / 1000) * 1000; // Round to nearest 1000
  }

  private buildIsoStart(): string | null {
    if (!this.date || !this.time) return null;
    // Format: YYYY-MM-DDTHH:mm:ss+07:00 (múi giờ Việt Nam)
    // Backend sẽ parse bằng new Date() và lấy timeString để so với time_slots
    const isoString = `${this.date}T${this.time}:00+07:00`;
    console.log('[buildIsoStart] date:', this.date, 'time:', this.time, '=> ISO:', isoString);
    return isoString;
  }

  async checkAvailability(){
    if(this.checkingAvailability){
      this.pendingRecheck = true;
      return;
    }
    this.pricingError = null; this.bookingMessage = null; this.bookingError = null;
    if(!this.field){ this.pricingError = 'Thiếu thông tin sân'; this.pricing = null; return; }
    const startIso = this.buildIsoStart();
    if(!startIso){ this.pricingError = 'Vui lòng chọn ngày và giờ bắt đầu'; this.pricing = null; return; }
    if(!this.duration || this.duration < 30){ this.pricingError = 'Vui lòng nhập thời lượng (tối thiểu 30 phút)'; this.pricing = null; return; }
    // Validate using local date/time to avoid parsing non-ISO payload
    const startDate = new Date(`${this.date}T${this.time}:00`);
    if(startDate.getTime() <= Date.now()){
      this.pricingError = '🕒 Vui lòng chọn khung giờ ở tương lai (không thể đặt giờ quá khứ).';
      this.pricing = null;
      return;
    }
    this.checkingAvailability = true;
    this.pricingPending = true;
    try{
      // Tính giá client-side dựa trên time_slots
      const pricePerHour = this.calculatePricePerHour(this.time);
      const hours = this.duration / 60;
      const totalPrice = Math.ceil((pricePerHour * hours) / 1000) * 1000;
      
      // Tính end time
      const startDate = new Date(`${this.date}T${this.time}:00`);
      const endDate = new Date(startDate.getTime() + this.duration * 60000);
      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      
      console.log('=== CLIENT-SIDE PRICING ===');
      console.log('[Time]:', this.time);
      console.log('[Price/hour]:', pricePerHour, 'VND');
      console.log('[Duration]:', this.duration, 'minutes');
      console.log('[Total]:', totalPrice, 'VND');
      
      // Build pricing object client-side
      this.pricing = {
        available: true,
        field_name: this.field?.name || '',
        booking_details: {
          date: this.date,
          start_time: this.time + ':00',
          end_time: endTime + ':00',
          duration: `${this.duration} phút`
        },
        pricing: {
          price_per_hour: pricePerHour,
          total_price: totalPrice,
          currency: 'VND'
        },
        message: 'Giá đã được tính theo khung giờ'
      } as any;
      
      // Gọi API chỉ để check availability (không dùng giá từ BE nữa)
      const payload: any = {
        fieldId: this.field.id,
        startTime: startIso,
        durationMinutes: this.duration,
      };
      
      try {
        await this.pricingService.checkAvailability(payload);
        // Nếu API success thì giữ nguyên pricing đã tính
      } catch (apiError: any) {
        // Nếu API trả conflict/error thì throw để hiển thị lỗi
        if (apiError.status === 409) {
          throw apiError;
        }
        // Các lỗi khác thì vẫn giữ pricing client-side
        console.warn('[API Check] Failed but keeping client-side pricing:', apiError);
      }
      
      console.log('[Response] pricing:', this.pricing?.pricing);
      console.log('=== PRICING CHECK END ===');

      // Nếu user đã chọn voucher hoặc có mã, kiểm tra voucher riêng và áp lên client-side
      const voucherCodeToCheck = this.selectedVoucher?.code || this.voucherCode;
      if (voucherCodeToCheck) {
        try {
          const orderValue = this.pricing?.pricing?.total_price ?? 0;
          const voucherRes = await this.voucherService.checkVoucher(voucherCodeToCheck, orderValue);
          // Cập nhật UI với giá đã giảm (tính trên client)
          if (this.pricing && this.pricing.pricing) {
            this.pricing.pricing.original_price = this.pricing.pricing.total_price;
            this.pricing.pricing.discount = voucherRes.discountAmount;
            this.pricing.pricing.total_price = voucherRes.finalAmount;
            // Store applied voucher info for display
            this.pricing.voucher = { code: voucherRes.code, discount: voucherRes.discountAmount } as any;
          }
        } catch (err: any) {
          // Nếu voucher không hợp lệ thì hiển thị lỗi nhỏ nhưng vẫn giữ giá gốc
          this.pricingError = (err?.error?.message) || err?.message || 'Mã voucher không hợp lệ';
        }
      }
      
      // Refresh schedule grid sau khi check để cập nhật trạng thái slots
      if (this.date) {
        await this.loadDailySchedule(this.date);
      }
    }catch(e: any){
      console.error('[checkAvailability] Error:', e);
      console.error('[checkAvailability] Error details:', {
        status: e?.status,
        statusText: e?.statusText,
        errorMessage: e?.error?.message,
        message: e?.message
      });
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
    console.log('[onScheduleChange] Called with:', {
      date: this.date,
      time: this.time,
      duration: this.duration
    });
    
    // Mark affected slots immediately when duration changes
    if (this.duration && this.date && this.time) {
      const startIso = new Date(`${this.date}T${this.time}:00`).toISOString();
      if (!isNaN(new Date(startIso).getTime())) {
        this.markAffectedSlots(startIso, this.duration);
      }
    }
    
    if(this.autoCheckHandle){
      clearTimeout(this.autoCheckHandle);
      console.log('[onScheduleChange] Cleared previous timeout');
    }
    this.autoCheckHandle = setTimeout(() => {
      console.log('[onScheduleChange] Timeout fired after 400ms, calling checkAvailability()');
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

    // LƯU STATE: Lưu lại các slot đã chọn trước khi refresh
    const previousSelections = this.slots
      .filter(s => s.selected)
      .map(s => s.iso);

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
            // KHÔI PHỤC STATE: Giữ lại selection nếu slot này đã được chọn trước đó
            selected: previousSelections.includes(slotIso) && !isBooked,
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
    // Only run auto-refresh in browser context (avoid SSR errors)
    // Clear existing interval
    this.stopScheduleAutoRefresh();
    if (!(typeof window !== 'undefined' && window && this.isBrowser())) return;

    // Refresh mỗi 5 giây
    this.scheduleRefreshInterval = setInterval(() => {
      if (this.date && this.field) {
        console.log('[ScheduleRefresh] Auto-refreshing schedule...');
        this.loadDailySchedule(this.date);
      }
    }, 5000);
  }

  private isBrowser(): boolean {
    // Use the Angular platform id to detect browser
    try {
      // lazy import to avoid bundling isPlatformBrowser in server builds
      // but we can still use a runtime check here
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isPlatformBrowser } = require('@angular/common');
      return isPlatformBrowser(this.platformId);
    } catch (e) {
      return typeof window !== 'undefined';
    }
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
    
    console.log('[selectSlot] Slot clicked:', slot.timeLabel, 'iso:', slot.iso);
    
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
      console.log('[selectSlot] Set default duration: 60 minutes');
    }
    
    // Mark all affected slots based on duration
    this.markAffectedSlots(slot.iso, this.duration);
    
    // Trigger pricing check IMMEDIATELY
    console.log('[selectSlot] Calling checkAvailability immediately');
    this.checkAvailability();
  }

  /**
   * Alias for selectSlot - called from HTML template
   */
  onSlotClick(slot: any) {
    this.selectSlot(slot);
  }

  /**
   * Open voucher selection modal
   */
  async openVoucherModal() {
    this.showVoucherModal = true;
    await this.loadAvailableVouchers();
  }

  /**
   * Close voucher modal
   */
  closeVoucherModal() {
    this.showVoucherModal = false;
  }

  /**
   * Load available vouchers from backend
   */
  async loadAvailableVouchers() {
    this.loadingVouchers = true;
    try {
      // Lấy orderValue từ pricing hoặc tính từ field price
      let orderValue = this.pricing?.pricing?.total_price || 0;
      
      // Nếu chưa có pricing, tính giá tạm từ field và duration
      if (orderValue === 0 && this.field && this.duration) {
        const pricePerHour = this.field.pricePerHour || 0;
        const hours = this.duration / 60;
        orderValue = pricePerHour * hours;
      }

      console.log('[VoucherModal] Loading vouchers for order value:', orderValue);
      
      const vouchers = await this.voucherService.getAvailableVouchers(orderValue);
      this.availableVouchers = vouchers;
      
      console.log('[VoucherModal] Loaded vouchers:', vouchers);
      
      if (vouchers.length === 0) {
        console.warn('[VoucherModal] No vouchers available for this order value');
      }
    } catch (error: any) {
      console.error('[VoucherModal] Failed to load vouchers:', error);
      this.availableVouchers = [];
      
      // Hiển thị thông báo lỗi cho user
      if (error.status === 0) {
        console.error('[VoucherModal] Backend không phản hồi. Kiểm tra server.');
      }
    } finally {
      this.loadingVouchers = false;
    }
  }

  /**
   * Apply selected voucher
   */
  applyVoucher(voucher: Voucher) {
    this.selectedVoucher = voucher;
    this.voucherCode = voucher.code;
    this.closeVoucherModal();
    // Re-check availability with voucher
    if (this.date && this.time && this.duration) {
      this.checkAvailability();
    }
  }

  /**
   * Remove applied voucher
   */
  removeVoucher() {
    this.selectedVoucher = null;
    this.voucherCode = '';
    this.checkAvailability();
  }

  /**
   * Open Google Maps with directions to the field
   */
  getDirections(): void {
    if (!this.field) return;

    // Get coordinates from field (mapped from branch.address)
    const lat = this.field.latitude;
    const lng = this.field.longitude;

    let url = '';
    
    if (lat && lng) {
      // Use coordinates if available (most accurate)
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else {
      // Fallback to address string search
      const addressParts = [
        this.field.street,
        this.field.ward,
        this.field.city
      ].filter(Boolean);
      
      if (addressParts.length > 0) {
        const address = addressParts.join(', ');
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
      } else {
        alert('Không có thông tin địa chỉ để chỉ đường');
        return;
      }
    }

    window.open(url, '_blank');
  }

}
