import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FieldsService, Field } from '../services/fields.service';
import { AuthStateService } from '../services/auth-state.service';

@Component({
  selector: 'app-admin-fields',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-fields.html',
  styleUrls: ['./admin-fields.scss']
})
export class AdminFieldsComponent implements OnInit {
  fields: Field[] = [];
  loading = false;
  error: string | null = null;

  constructor(private fieldsService: FieldsService, private router: Router, private authState: AuthStateService) {}

  get isAdmin() { return this.authState.isAdmin(); }

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.error = 'Bạn không có quyền truy cập.';
      return;
    }
    this.load();
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      this.fields = await this.fieldsService.getFields();
    } catch (e: any) {
      console.warn('load fields failed', e);
      this.error = e?.error?.message || e?.message || 'Không tải được danh sách sân.';
    } finally {
      this.loading = false;
    }
  }

  onCreate() {
    this.router.navigate(['/admin/fields/create']);
  }

  onEdit(id: string) {
    this.router.navigate([`/admin/fields/${id}/edit`]);
  }

  async onDelete(id: string) {
    if (!confirm('Xác nhận xóa sân?')) return;
    try {
      await this.fieldsService.deleteField(id);
      await this.load();
    } catch (e: any) {
      alert(e?.error?.message || e?.message || 'Xóa thất bại');
    }
  }

  getActiveCount(): number {
    return this.fields.filter(f => f.status).length;
  }

  getInactiveCount(): number {
    return this.fields.filter(f => !f.status).length;
  }

  getTypeCount(): number {
    const types = new Set(this.fields.map(f => f.fieldType || f.type).filter(Boolean));
    return types.size;
  }
}
