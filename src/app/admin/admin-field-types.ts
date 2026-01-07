import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FieldsService } from '../services/fields.service';
import { AuthStateService } from '../services/auth-state.service';

@Component({
  selector: 'app-admin-field-types',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-field-types.html',
  styleUrls: ['./admin-field-types.scss']
})
export class AdminFieldTypesComponent implements OnInit {
  fieldTypes: { id: string; name: string; description?: string }[] = [];
  loading = false;
  error: string | null = null;
  
  newFieldType = { name: '', description: '' };
  adding = false;
  deleting: { [key: string]: boolean } = {};

  constructor(
    private fieldsService: FieldsService,
    private authState: AuthStateService
  ) {}

  ngOnInit(): void {
    if (!this.authState.isAdmin()) {
      this.error = 'Bạn không có quyền truy cập trang này.';
      return;
    }
    this.loadFieldTypes();
  }

  async loadFieldTypes() {
    this.loading = true;
    this.error = null;
    try {
      this.fieldTypes = await this.fieldsService.getFieldTypes();
    } catch (e: any) {
      this.error = 'Tải danh sách loại sân thất bại. Vui lòng thử lại.';
      console.error('[AdminFieldTypesComponent] Load failed:', e);
    } finally {
      this.loading = false;
    }
  }

  async onAdd() {
    if (!this.newFieldType.name.trim()) {
      alert('Vui lòng nhập tên loại sân.');
      return;
    }

    this.adding = true;
    try {
      await this.fieldsService.createFieldType(this.newFieldType);
      this.newFieldType = { name: '', description: '' }; // Reset form
      await this.loadFieldTypes(); // Refresh list
    } catch (e: any) {
      alert('Thêm loại sân thất bại: ' + (e?.error?.message || e.message));
      console.error('[AdminFieldTypesComponent] Add failed:', e);
    } finally {
      this.adding = false;
    }
  }

  async onDelete(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa loại sân này không? Hành động này không thể hoàn tác.')) {
      return;
    }

    this.deleting[id] = true;
    try {
      await this.fieldsService.deleteFieldType(id);
      await this.loadFieldTypes(); // Refresh list
    } catch (e: any) {
      alert('Xóa loại sân thất bại: ' + (e?.error?.message || e.message));
      console.error('[AdminFieldTypesComponent] Delete failed:', e);
    } finally {
      this.deleting[id] = false;
    }
  }
}
