import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminUsersService } from '../../services/admin-users.service';
import { AccountMeResponse } from '../../services/users.service';
import { AuthStateService } from '../../services/auth-state.service';
import { BranchesService, Branch } from '../../services/branches.service';

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
      this.error = 'Bạn không có quyền truy cập trang quản trị người dùng.';
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
        this.branchesError = 'Không tìm thấy danh sách chi nhánh từ backend.';
        this.branches = [];
        return;
      }
      this.branches = list;
    } catch (e) {
      this.branchesError = 'Lỗi khi tải danh sách chi nhánh.';
      this.branches = [];
    } finally {
      this.branchesLoading = false;
    }
  }

  async loadUsers(page = 1): Promise<void> {
    this.loading = true;
    this.error = null;
    this.success = null;
    try {
      const res = await this.adminUsersService.getUsers(page);
      this.users = res.data || [];
      this.total = res.total || 0;
      this.page = page;
    } catch (err: any) {
      console.warn('[AdminUsersComponent] loadUsers failed', err);
      this.error = err?.error?.message || err?.message || 'Không tải được danh sách người dùng.';
    } finally {
      this.loading = false;
    }
  }

  async banUser(user: AccountMeResponse): Promise<void> {
    if (!confirm(`Khóa tài khoản ${user.email}?`)) {
      return;
    }
    this.pendingBan = user.id;
    this.error = null;
    this.success = null;
    try {
      const res = await this.adminUsersService.banUser(user.id);
      this.success = res?.message || 'Đã khóa tài khoản.';
      await this.loadUsers(this.page);
    } catch (err: any) {
      console.warn('[AdminUsersComponent] banUser failed', err);
      this.error = err?.error?.message || err?.message || 'Không khóa được tài khoản.';
    } finally {
      this.pendingBan = null;
    }
  }

  async unbanUser(user: AccountMeResponse): Promise<void> {
    if (!confirm(`Mở khóa tài khoản ${user.email}?`)) {
      return;
    }
    this.pendingUnban = user.id;
    this.error = null;
    this.success = null;
    try {
      const res = await this.adminUsersService.unbanUser(user.id);
      this.success = res?.message || 'Đã mở khóa tài khoản.';
      await this.loadUsers(this.page);
    } catch (err: any) {
      console.warn('[AdminUsersComponent] unbanUser failed', err);
      this.error = err?.error?.message || err?.message || 'Không mở khóa được tài khoản.';
    } finally {
      this.pendingUnban = null;
    }
  }

  async onCreateEmployee(): Promise<void> {
    if (!this.isAdmin) {
      this.error = 'Bạn không có quyền tạo nhân viên.';
      return;
    }
    this.creating = true;
    this.error = null;
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
      };
      const res = await this.adminUsersService.createEmployee(payload);
      this.success = res?.message || 'Tạo nhân viên thành công.';
      // reset form
      this.newEmployee = { email: '', password: '', fullName: '', phoneNumber: '', gender: '', bio: '', branchId: '' };
      // reload list
      await this.loadUsers(this.page);
    } catch (err: any) {
      console.warn('[AdminUsersComponent] createEmployee failed', err);
      // Friendly handling when backend reports missing/invalid branch
      const serverMsg = err?.error?.message || err?.message || '';
      if (/branch|chi nhán|branchId|branch id/i.test(String(serverMsg))) {
        this.error = 'Chi nhánh không tồn tại hoặc ID không hợp lệ. Vui lòng kiểm tra Branch ID.';
      } else {
        this.error = serverMsg || 'Không tạo được nhân viên.';
      }
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
}
