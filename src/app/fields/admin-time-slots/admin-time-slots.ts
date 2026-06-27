import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { PricingService, TimeSlotDto, CreateTimeSlotDto, UpdateTimeSlotDto } from '../../services/pricing.service';
import { FieldsService } from '../../services/fields.service';
import { AuthStateService } from '../../services/auth-state.service';
import { IdEncoderService } from '../../services/id-encoder.service';

interface EditableTimeSlot extends TimeSlotDto {
  _editPrice?: number;
  _editIsPeak?: boolean;
}

@Component({
  selector: 'app-admin-time-slots',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-time-slots.html',
  styleUrls: ['./admin-time-slots.scss']
})
export class AdminTimeSlotsComponent implements OnInit {
  fieldId: string | null = null;
  fieldName: string = '';
  
  slots: EditableTimeSlot[] = [];
  filteredSlots: EditableTimeSlot[] = [];
  
  loading = false;
  saving = false;
  error: string | null = null;
  successMsg: string | null = null;
  
  newSlot: { startTime: string; endTime: string; price: number; isPeakHour: boolean } = {
    startTime: '',
    endTime: '',
    price: 0,
    isPeakHour: false
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pricingService: PricingService,
    private fieldsService: FieldsService,
    private authState: AuthStateService,
    private idEncoder: IdEncoderService
  ) {}

  get canManage() { return this.authState.canManage(); }

  ngOnInit(): void {
    if (!this.canManage) {
      this.error = 'Bạn không có quyền truy cập.';
      return;
    }
    
    const encodedId = this.route.snapshot.paramMap.get('id');
    this.fieldId = encodedId ? this.idEncoder.decode(encodedId) : null;
    
    if (!this.fieldId) {
      this.error = 'Không tìm thấy ID sân hợp lệ.';
      return;
    }

    this.loadFieldInfo();
    this.load();
  }

  async loadFieldInfo() {
    try {
      if (!this.fieldId) return;
      const f = await this.fieldsService.getFieldById(this.fieldId);
      this.fieldName = f.name;
    } catch (e: any) {
      console.warn('Load field info failed', e);
    }
  }

  async load() {
    this.loading = true;
    this.error = null;
    this.successMsg = null;
    
    try {
      // Vì API backend get-all, ta lấy tất cả và filter
      const allSlots = await this.pricingService.getTimeSlots();
      this.slots = allSlots.map(s => ({
        ...s,
        _editPrice: s.price,
        _editIsPeak: s.isPeakHour
      }));
      
      this.filteredSlots = this.slots.filter(s => s.field?.id === this.fieldId);
      
      // Sort by start time
      this.filteredSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    } catch (e: any) {
      console.error('Load time slots failed', e);
      this.error = e?.error?.message || e?.message || 'Không tải được danh sách khung giờ.';
    } finally {
      this.loading = false;
    }
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  }

  async onCreate() {
    if (!this.fieldId) return;
    
    if (!this.newSlot.startTime || !this.newSlot.endTime) {
      this.error = 'Vui lòng nhập giờ bắt đầu và kết thúc.';
      return;
    }
    
    if (this.newSlot.price == null || this.newSlot.price < 0) {
      this.error = 'Giá phải lớn hơn hoặc bằng 0.';
      return;
    }
    
    this.saving = true;
    this.error = null;
    this.successMsg = null;
    
    try {
      const payload: CreateTimeSlotDto = {
        fieldId: this.fieldId,
        startTime: this.newSlot.startTime.length === 5 ? `${this.newSlot.startTime}:00` : this.newSlot.startTime,
        endTime: this.newSlot.endTime.length === 5 ? `${this.newSlot.endTime}:00` : this.newSlot.endTime,
        price: this.newSlot.price,
        isPeakHour: this.newSlot.isPeakHour
      };
      
      await this.pricingService.createTimeSlot(payload);
      
      this.successMsg = 'Thêm khung giờ thành công!';
      
      // Reset form
      this.newSlot = { startTime: '', endTime: '', price: 0, isPeakHour: false };
      
      // Reload
      await this.load();
    } catch (e: any) {
      console.error('Create time slot failed', e);
      this.error = e?.error?.message || e?.message || 'Thêm khung giờ thất bại.';
    } finally {
      this.saving = false;
    }
  }

  async onUpdate(slot: EditableTimeSlot) {
    if (slot._editPrice == null || slot._editPrice < 0) {
      this.error = 'Giá phải lớn hơn hoặc bằng 0.';
      return;
    }
    
    this.error = null;
    this.successMsg = null;
    
    try {
      const payload: UpdateTimeSlotDto = {
        price: slot._editPrice,
        isPeakHour: slot._editIsPeak
      };
      
      await this.pricingService.updateTimeSlot(slot.id, payload);
      this.successMsg = 'Cập nhật thành công!';
      
      // Update local state
      slot.price = slot._editPrice;
      slot.isPeakHour = slot._editIsPeak || false;
    } catch (e: any) {
      console.error('Update time slot failed', e);
      this.error = e?.error?.message || e?.message || 'Cập nhật khung giờ thất bại.';
    }
  }

  goBack() {
    this.router.navigate(['/admin/fields']);
  }
}
