import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FieldsService, FieldStatus } from '../services/fields.service';
import { BranchesService, Branch } from '../services/branches.service';
import { AuthStateService } from '../services/auth-state.service';
import { IdEncoderService } from '../services/id-encoder.service';

@Component({
  selector: 'app-admin-field-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-field-form.html',
  styleUrls: ['./admin-field-form.scss']
})
export class AdminFieldFormComponent implements OnInit {
  id: string | null = null;
  model: any = { 
    name: '', 
    description: '',
    fieldTypeId: '', 
    branchId: '',
    utilityIds: [],
    status: FieldStatus.ACTIVE // Mặc định là hoạt động
  };
  loading = false;
  saving = false;
  error: string | null = null;
  images: File[] = [];
  branches: Branch[] = [];
  branchesLoading = false;
  fieldTypes: { id: string; name: string; description?: string }[] = [];
  fieldTypesLoading = false;
  utilities: { id: number; name: string; price?: number }[] = [];
  utilitiesLoading = false;
  
  // Danh sách trạng thái sân (chỉ 2 trạng thái: active/closed)
  statusOptions = [
    { value: FieldStatus.ACTIVE, label: 'Đang hoạt động' },
    { value: FieldStatus.CLOSED, label: 'Tạm đóng' }
  ];

  constructor(
    private route: ActivatedRoute, 
    private fieldsService: FieldsService, 
    public router: Router, 
    private authState: AuthStateService, 
    private branchesSrv: BranchesService,
    private idEncoder: IdEncoderService  // Service giải mã ID
  ) {}

  get isAdmin() { return this.authState.isAdmin(); }
  get canManage() { return this.authState.canManage(); }

  ngOnInit(): void {
    if (!this.canManage) {
      this.error = 'Bạn không có quyền.';
      return;
    }
    // Lấy ID đã mã hóa từ URL và giải mã
    const encodedId = this.route.snapshot.paramMap.get('id');
    this.id = encodedId ? this.idEncoder.decode(encodedId) : null;
    
    this.loadFieldTypes();
    this.loadBranches();
    this.loadUtilities();
    if (this.id) this.load();
  }

  async load() {
    this.loading = true;
    try {
      const f = await this.fieldsService.getFieldById(this.id as string);
      this.model = { 
        name: f.name, 
        description: f.description, 
        fieldTypeId: f.fieldTypeId || '', 
        branchId: (f as any).branchId || '',
        utilityIds: (f as any).utilityIds || [],
        status: f.status // Load status từ backend (boolean hoặc FieldStatus enum)
      };
    } catch (e: any) {
      console.error('[AdminFieldFormComponent] Load failed:', e?.error?.message || e?.message, e);
    } finally {
      this.loading = false;
    }
  }

  async loadFieldTypes() {
    this.fieldTypesLoading = true;
    try {
      this.fieldTypes = await this.fieldsService.getFieldTypes();
      if (!this.fieldTypes || this.fieldTypes.length === 0) {
        console.warn('[AdminFieldFormComponent] No field types found');
      }
    } catch (e: any) {
      console.error('[AdminFieldFormComponent] Load field types failed:', e?.message, e);
      this.fieldTypes = [];
    } finally {
      this.fieldTypesLoading = false;
    }
  }

  async loadBranches() {
    this.branchesLoading = true;
    try {
      this.branches = await this.branchesSrv.listBranches();
      if (!this.branches || this.branches.length === 0) {
        console.warn('[AdminFieldFormComponent] No branches found');
      }
    } catch (e: any) {
      console.error('[AdminFieldFormComponent] Load branches failed:', e?.message, e);
      this.branches = [];
    } finally {
      this.branchesLoading = false;
    }
  }

  async loadUtilities() {
    this.utilitiesLoading = true;
    try {
      this.utilities = await this.fieldsService.getUtilities();
      if (!this.utilities || this.utilities.length === 0) {
        console.warn('[AdminFieldFormComponent] No utilities found');
      }
    } catch (e: any) {
      console.error('[AdminFieldFormComponent] Load utilities failed:', e?.message, e);
      this.utilities = [];
    } finally {
      this.utilitiesLoading = false;
    }
  }

  onFiles(files: FileList | null) {
    this.images = files ? Array.from(files) : [];
  }

  toggleUtility(utilityId: number) {
    const index = this.model.utilityIds.indexOf(utilityId);
    if (index > -1) {
      this.model.utilityIds.splice(index, 1);
    } else {
      this.model.utilityIds.push(utilityId);
    }
  }

  isUtilitySelected(utilityId: number): boolean {
    return this.model.utilityIds.includes(utilityId);
  }

  async onSave() {
    this.saving = true;
    try {
      // Validate required fields
      if (!this.model.name?.trim()) {
        alert('Vui lòng nhập tên sân');
        this.saving = false;
        return;
      }
      if (!this.model.fieldTypeId) {
        alert('Vui lòng chọn loại sân');
        this.saving = false;
        return;
      }
      
      // Admin MUST provide branchId, Manager can omit (backend will auto-fill)
      if (this.isAdmin && !this.model.branchId) {
        alert('Admin phải chọn chi nhánh');
        this.saving = false;
        return;
      }

      // Build payload matching CreateFieldDto exactly
      const payload: any = {
        name: this.model.name.trim(),
        fieldTypeId: this.model.fieldTypeId,
      };
      
      // Optional fields
      if (this.model.description?.trim()) {
        payload.description = this.model.description.trim();
      }
      // Only send branchId if provided (Manager doesn't need to provide it)
      if (this.model.branchId) {
        payload.branchId = this.model.branchId;
      }
      // Send utilityIds if selected
      if (this.model.utilityIds && this.model.utilityIds.length > 0) {
        payload.utilityIds = this.model.utilityIds;
      }
      // Send status - convert enum to boolean if needed
      if (this.model.status !== undefined) {
        payload.status = this.model.status === FieldStatus.ACTIVE || this.model.status === true;
      }

      let res;
      if (this.id) {
        res = await this.fieldsService.updateField(this.id, payload);
      } else {
        res = await this.fieldsService.createField(payload);
      }
      
      // Upload images if any
      if (this.images.length && res?.id) {
        await this.fieldsService.uploadImages(res.id, this.images);
      }
      
      this.router.navigate(['/admin/fields']);
    } catch (e: any) {
      const msg = e?.error?.message || e?.message || 'Lưu không thành công.';
      console.error('[AdminFieldFormComponent] Save failed:', msg, e);
      alert('Lỗi: ' + msg); // Show error in alert instead of UI
    } finally {
      this.saving = false;
    }
  }
}
