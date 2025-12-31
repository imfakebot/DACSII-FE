import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminUsersService } from '../../services/admin-users.service';
import { AccountMeResponse } from '../../services/users.service';
import { AuthStateService } from '../../services/auth-state.service';
import { BranchesService, Branch } from '../../services/branches.service';
import { formatDisplayDate } from '../../utils/date.util';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.scss'],
})
export class AdminUsersComponent implements OnInit {
  users: AccountMeResponse[] = [];
  total = 0;
  page = 1;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  pendingBan: string | null = null;
  pendingUnban: string | null = null;
  // Create employee form model
  newEmployee: any = {
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    gender: '',
    bio: '',
    branchId: '',
    role: 'branch_manager', // default kept for backward compatibility
  };
  creating = false;
  // branches
  branches: Branch[] = [];
  branchesLoading = false;
  branchesError: string | null = null;

  constructor(
    private adminUsersService: AdminUsersService,
    private authState: AuthStateService,
    private branchesService: BranchesService,
  ) {}

  get isAdmin(): boolean {
    return this.authState.isAdmin();
  }

  async ngOnInit(): Promise<void> {
    if (!this.isAdmin) {
      console.error('[AdminUsersComponent] Access denied: user is not admin');
      return;
    }
    // Debug: show current auth user to help diagnose permission issues
    try {
      console.debug('[AdminUsersComponent] isAdmin check passed, currentUser =', this.authState.getCurrentUser());
    } catch {}
    await this.loadUsers();
    // Try load branches for the create form
    this.loadBranches();
  }

  private async loadBranches(): Promise<void> {
    this.branchesLoading = true;
    this.branchesError = null;
    try {
      const list = await this.branchesService.listBranches();
      if (!list || !list.length) {
        console.warn('Không tìm thấy danh sách chi nhánh từ backend.');
        this.branches = [];
        return;
      }
      this.branches = list;
    } catch (e) {
      console.error('Lỗi khi tải danh sách chi nhánh:', e);
      this.branches = [];
    } finally {
      this.branchesLoading = false;
    }
  }

  async loadUsers(page = 1): Promise<void> {
    this.loading = true;
    this.success = null;
    try {
      const res = await this.adminUsersService.getUsers(page);
      this.users = res.data || [];
      this.total = res.total || 0;
      this.page = page;
    } catch (err: any) {
      console.error('[AdminUsersComponent] loadUsers failed:', err?.error?.message || err?.message || 'Không tải được danh sách người dùng.', err);
    } finally {
      this.loading = false;
    }
  }

  async banUser(user: AccountMeResponse): Promise<void> {
    if (!confirm(`Khóa tài khoản ${user.email}?`)) {
      return;
    }
    this.pendingBan = user.id;
    this.success = null;
    try {
      const res = await this.adminUsersService.banUser(user.id);
      this.success = res?.message || 'Đã khóa tài khoản.';
      await this.loadUsers(this.page);
    } catch (err: any) {
      console.error('[AdminUsersComponent] banUser failed:', err?.error?.message || err?.message || 'Không khóa được tài khoản.', err);
    } finally {
      this.pendingBan = null;
    }
  }

  async unbanUser(user: AccountMeResponse): Promise<void> {
    if (!confirm(`Mở khóa tài khoản ${user.email}?`)) {
      return;
    }
    this.pendingUnban = user.id;
    this.success = null;
    try {
      const res = await this.adminUsersService.unbanUser(user.id);
      this.success = res?.message || 'Đã mở khóa tài khoản.';
      await this.loadUsers(this.page);
    } catch (err: any) {
      console.error('[AdminUsersComponent] unbanUser failed:', err?.error?.message || err?.message || 'Không mở khóa được tài khoản.', err);
    } finally {
      this.pendingUnban = null;
    }
  }

  async onCreateEmployee(): Promise<void> {
    if (!this.isAdmin) {
      console.error('[AdminUsersComponent] createEmployee: Access denied');
      return;
    }
    this.creating = true;
    this.success = null;
    try {
      const payload = {
        email: this.newEmployee.email,
        password: this.newEmployee.password,
        fullName: this.newEmployee.fullName,
        phoneNumber: this.newEmployee.phoneNumber,
        gender: this.newEmployee.gender || undefined,
        bio: this.newEmployee.bio || undefined,
        branchId: this.newEmployee.branchId || undefined,
          role: this.newEmployee.role || 'branch_manager',
      };
      const res = await this.adminUsersService.createEmployee(payload);
      this.success = res?.message || 'Tạo nhân viên thành công.';
      // reset form
        this.newEmployee = { email: '', password: '', fullName: '', phoneNumber: '', gender: '', bio: '', branchId: '', role: 'branch_manager' };
      // reload list
      await this.loadUsers(this.page);
    } catch (err: any) {
      const serverMsg = err?.error?.message || err?.message || 'Không tạo được nhân viên.';
      console.error('[AdminUsersComponent] createEmployee failed:', serverMsg, err);
    } finally {
      this.creating = false;
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / 10));
  }

  canGoPrev(): boolean {
    return this.page > 1;
  }

  canGoNext(): boolean {
    return this.page < this.totalPages;
  }

  formatDateTime(iso?: string | null): string {
    return formatDisplayDate(iso) || 'Chưa có';
  }
}
