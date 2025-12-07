import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FieldsService } from '../services/fields.service';
import { BranchesService, Branch } from '../services/branches.service';
import { AuthStateService } from '../services/auth-state.service';

@Component({
  selector: 'app-admin-field-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-field-form.html',
  styleUrls: ['./admin-field-form.scss']
})
export class AdminFieldFormComponent implements OnInit {
  id: string | null = null;
  model: any = { name: '', description: '', fieldTypeId: '', fieldType: '', branchId: '', street: '', city: '' };
  loading = false;
  saving = false;
  error: string | null = null;
  images: File[] = [];
  branches: Branch[] = [];
  branchesLoading = false;
  branchesError: string | null = null;

  constructor(private route: ActivatedRoute, private fieldsService: FieldsService, public router: Router, private authState: AuthStateService, private branchesSrv: BranchesService) {}

  get isAdmin() { return this.authState.isAdmin(); }

  ngOnInit(): void {
    if (!this.isAdmin) {
      this.error = 'Bạn không có quyền.';
      return;
    }
    this.id = this.route.snapshot.paramMap.get('id');
    this.loadBranches();
    if (this.id) this.load();
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      const f = await this.fieldsService.getFieldById(this.id as string);
      this.model = { name: f.name, description: f.description, fieldTypeId: f.fieldTypeId, fieldType: f.fieldType, branchId: (f as any).branchId ?? '', street: f.street, city: f.city };
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || 'Không tải được thông tin sân.';
    } finally {
      this.loading = false;
    }
  }

  async loadBranches() {
    this.branchesLoading = true;
    this.branchesError = null;
    try {
      this.branches = await this.branchesSrv.listBranches();
    } catch (e: any) {
      this.branchesError = e?.message || 'Không tải được danh sách chi nhánh.';
    } finally {
      this.branchesLoading = false;
    }
  }

  onFiles(files: FileList | null) {
    this.images = files ? Array.from(files) : [];
  }

  async onSave() {
    this.saving = true;
    this.error = null;
    try {
      // Build payload according to backend validator: avoid `fieldType` and nested `address`.
      const payload: any = {
        name: this.model.name,
        description: this.model.description,
        fieldTypeId: this.model.fieldTypeId || undefined,
        branchId: this.model.branchId || undefined,
      };
      // include flat address fields if present (backend may accept them)
      if (this.model.street) payload.street = this.model.street;
      if (this.model.city) payload.city = this.model.city;

      let res;
      if (this.id) res = await this.fieldsService.updateField(this.id, payload);
      else res = await this.fieldsService.createField(payload);
      // upload images if any
      if (this.images.length && res?.id) {
        await this.fieldsService.uploadImages(res.id ?? this.id ?? res?.fieldId, this.images);
      }
      this.router.navigate(['/admin/fields']);
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || 'Lưu không thành công.';
    } finally {
      this.saving = false;
    }
  }
}
