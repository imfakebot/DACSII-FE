import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UtilityService, UtilityDto, CreateUtilityDto, UpdateUtilityDto } from '../services/utility.service';

@Component({
  selector: 'app-admin-utilities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-utilities.html',
  styleUrl: './admin-utilities.scss',
})
export class AdminUtilitiesComponent implements OnInit {
  utilities: UtilityDto[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Form state
  showForm = false;
  editingId: number | null = null;
  formData: CreateUtilityDto = {
    name: '',
    iconUrl: ''
  };
  formLoading = false;
  formError: string | null = null;
  
  // Delete confirmation
  deletingId: number | null = null;
  deleteLoading = false;

  constructor(private svc: UtilityService) {}

  async ngOnInit(): Promise<void> {
    await this.loadUtilities();
  }

  async loadUtilities(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      this.utilities = await this.svc.getAll();
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không thể tải danh sách tiện ích';
    } finally {
      this.loading = false;
    }
  }

  openCreateForm(): void {
    this.showForm = true;
    this.editingId = null;
    this.formData = { name: '', iconUrl: '' };
    this.formError = null;
  }

  openEditForm(utility: UtilityDto): void {
    this.showForm = true;
    this.editingId = utility.id;
    this.formData = {
      name: utility.name,
      iconUrl: utility.iconUrl || ''
    };
    this.formError = null;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.formData = { name: '', iconUrl: '' };
    this.formError = null;
  }

  async submitForm(): Promise<void> {
    if (!this.formData.name.trim()) {
      this.formError = 'Vui lòng nhập tên tiện ích';
      return;
    }

    this.formLoading = true;
    this.formError = null;
    
    try {
      if (this.editingId) {
        const updatePayload: UpdateUtilityDto = {
          name: this.formData.name.trim(),
          iconUrl: this.formData.iconUrl?.trim() || undefined
        };
        await this.svc.update(this.editingId, updatePayload);
        this.successMessage = 'Cập nhật tiện ích thành công!';
      } else {
        const createPayload: CreateUtilityDto = {
          name: this.formData.name.trim(),
          iconUrl: this.formData.iconUrl?.trim() || undefined
        };
        await this.svc.create(createPayload);
        this.successMessage = 'Tạo tiện ích mới thành công!';
      }

      this.closeForm();
      
      setTimeout(() => {
        this.successMessage = null;
        this.loadUtilities();
      }, 2000);
    } catch (err: any) {
      this.formError = err?.error?.message || err?.message || 'Không thể lưu tiện ích';
    } finally {
      this.formLoading = false;
    }
  }

  confirmDelete(id: number): void {
    this.deletingId = id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  async deleteUtility(id: number): Promise<void> {
    this.deleteLoading = true;
    this.error = null;
    
    try {
      await this.svc.delete(id);
      this.successMessage = 'Xóa tiện ích thành công!';
      this.deletingId = null;
      
      setTimeout(() => {
        this.successMessage = null;
        this.loadUtilities();
      }, 2000);
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Không thể xóa tiện ích';
      this.deletingId = null;
    } finally {
      this.deleteLoading = false;
    }
  }

  getIconDisplay(iconUrl?: string): string {
    if (!iconUrl) return '🔧';
    // Return first emoji or character
    return iconUrl.charAt(0);
  }
}
