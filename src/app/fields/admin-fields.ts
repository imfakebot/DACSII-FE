import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field, FieldStatus, getFieldStatusLabel, getFieldStatusClass } from '../services/fields.service';
import { AuthStateService } from '../services/auth-state.service';
import { IdEncoderService } from '../services/id-encoder.service';
import { BranchesService, Branch } from '../services/branches.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-admin-fields',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-fields.html',
  styleUrls: ['./admin-fields.scss']
})
export class AdminFieldsComponent implements OnInit, OnDestroy {
  fields: Field[] = []; // Tất cả sân từ API
  filteredFields: Field[] = []; // Sân sau khi filter
  loading = false;
  error: string | null = null;
  
  // Branch filter
  branches: Branch[] = [];
  selectedBranchId = '';
  userBranchId: string | null = null;
  canSelectBranch = false;
  
  private routerSubscription?: Subscription;

  constructor(
    private fieldsService: FieldsService, 
    private router: Router, 
    private authState: AuthStateService,
    private idEncoder: IdEncoderService,
    private branchService: BranchesService
  ) {}

  get isAdmin() { return this.authState.isAdmin(); }
  get canManage() { return this.authState.canManage(); }

  async ngOnInit() {
    if (!this.canManage) {
      this.error = 'Bạn không có quyền truy cập.';
      return;
    }
    
    this.canSelectBranch = this.isAdmin;
    this.userBranchId = this.authState.getUserBranchId();
    
    console.log('🔍 [AdminFields] Init:', {
      isAdmin: this.isAdmin,
      isBranchManager: this.authState.isBranchManager(),
      userBranchId: this.userBranchId,
      canSelectBranch: this.canSelectBranch
    });
    
    // Nếu là branch_manager, auto-select branch của họ từ token
    if (this.userBranchId && !this.canSelectBranch) {
      this.selectedBranchId = this.userBranchId;
      console.log('🔍 [AdminFields] Auto-selected branch:', this.selectedBranchId);
    }
    
    await this.loadBranches();
    await this.load();
    
    // Auto-reload khi quay lại trang này sau khi edit/create
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(async (event: any) => {
        if (event.url === '/admin/fields' || event.url.startsWith('/admin/fields?')) {
          console.log('🔄 [AdminFields] Router navigated back, reloading...');
          await this.load();
        }
      });
  }
  
  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
  }
  
  async loadBranches() {
    try {
      this.branches = await this.branchService.listBranches();
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  }

  async load() {
    this.loading = true;
    this.error = null;
    try {
      this.fields = await this.fieldsService.getFields();
      this.applyFilter();
    } catch (e: any) {
      console.warn('load fields failed', e);
      this.error = e?.error?.message || e?.message || 'Không tải được danh sách sân.';
    } finally {
      this.loading = false;
    }
  }
  
  applyFilter() {
    console.log('🔍 [AdminFields] ApplyFilter:', {
      selectedBranchId: this.selectedBranchId,
      totalFields: this.fields.length,
      sampleField: this.fields[0] ? {
        name: this.fields[0].name,
        branchId: (this.fields[0] as any).branchId,
        branch_id: (this.fields[0] as any).branch_id,
        branch: (this.fields[0] as any).branch
      } : null
    });
    
    if (!this.selectedBranchId) {
      this.filteredFields = this.fields;
    } else {
      this.filteredFields = this.fields.filter(f => {
        // Check tất cả các variant có thể của branch id
        const fieldBranchId = (f as any).branchId || (f as any).branch_id || (f as any).branch?.id;
        return fieldBranchId === this.selectedBranchId;
      });
    }
    
    console.log('🔍 [AdminFields] Filtered result:', this.filteredFields.length);
  }
  
  onBranchFilterChange() {
    this.applyFilter();
  }
  
  clearBranchFilter() {
    this.selectedBranchId = '';
    this.applyFilter();
  }

  onCreate() {
    this.router.navigate(['/admin/fields/create']);
  }

  onEdit(id: string) {
    const encodedId = this.idEncoder.encode(id);  // Mã hóa ID trước khi hiển thị URL
    this.router.navigate([`/admin/fields/${encodedId}/edit`]);
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
    return this.filteredFields.filter(f => f.status === true || f.status === FieldStatus.ACTIVE).length;
  }

  getClosedCount(): number {
    return this.filteredFields.filter(f => f.status === false || f.status === FieldStatus.CLOSED).length;
  }

  getTypeCount(): number {
    const types = new Set(this.filteredFields.map(f => f.fieldType || f.type).filter(Boolean));
    return types.size;
  }

  // Helper methods cho trạng thái
  getStatusLabel(status: boolean | FieldStatus): string {
    return getFieldStatusLabel(status);
  }

  getStatusClass(status: boolean | FieldStatus): string {
    return getFieldStatusClass(status);
  }
}
