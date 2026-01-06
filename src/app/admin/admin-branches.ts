import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BranchAdminService, BranchDto, CreateBranchDto, UpdateBranchDto, AvailableManager } from '../services/branch-admin.service';
import { LocationsService, City, Ward } from '../services/locations.service';
import { LocationPickerComponent } from '../components/location-picker.component';

@Component({
  selector: 'app-admin-branches',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationPickerComponent],
  templateUrl: './admin-branches.html',
  styleUrls: ['./admin-branches.scss'],
})
export class AdminBranchesComponent implements OnInit {
  branches: BranchDto[] = [];
  availableManagers: AvailableManager[] = [];
  cities: City[] = [];
  wards: Ward[] = [];
  
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // Form state
  showForm = false;
  editMode = false;
  currentBranch: BranchDto | null = null;
  showMapPicker = false;

  form: CreateBranchDto & { id?: string } = {
    name: '',
    phoneNumber: '',
    street: '',
    wardId: '',
    cityId: '',
    managerId: undefined,
    latitude: undefined,
    longitude: undefined,
    openTime: '05:00:00',
    closeTime: '23:00:00',
  };

  constructor(
    private branchService: BranchAdminService,
    private locationService: LocationsService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadBranches();
    await this.loadCities();
    await this.loadAvailableManagers();
  }

  async loadBranches(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      // Lấy danh sách branches cơ bản
      const basicBranches = await this.branchService.getAll();
      
      // Lấy chi tiết từng branch để có thông tin fields
      this.branches = await Promise.all(
        basicBranches.map(async (branch) => {
          try {
            const fullBranch = await this.branchService.getById(branch.id);
            return fullBranch;
          } catch {
            // Nếu không lấy được chi tiết, dùng dữ liệu cơ bản
            return branch;
          }
        })
      );
      
      console.log('[AdminBranches] Loaded branches with fields:', this.branches);
    } catch (err: any) {
      console.error('[AdminBranches] loadBranches failed', err);
      this.error = err?.error?.message || err?.message || 'Không tải được danh sách chi nhánh.';
    } finally {
      this.loading = false;
    }
  }

  async loadCities(): Promise<void> {
    try {
      this.cities = await this.locationService.getCities();
    } catch (err) {
      console.warn('[AdminBranches] loadCities failed', err);
    }
  }

  async loadAvailableManagers(): Promise<void> {
    try {
      this.availableManagers = await this.branchService.getAvailableManagers();
      console.log('[AdminBranches] Available managers:', this.availableManagers);
    } catch (err) {
      console.warn('[AdminBranches] loadAvailableManagers failed', err);
      this.availableManagers = [];
    }
  }

  /**
   * Lấy danh sách tất cả manager (có sẵn + đang gán cho các branch khác)
   * để hiển thị trong dropdown khi edit
   */
  getAllManagersForSelection(): AvailableManager[] {
    const managers: AvailableManager[] = [...this.availableManagers];
    
    // Thêm manager đang được gán cho các branch (trừ branch hiện tại nếu đang edit)
    for (const branch of this.branches) {
      if (branch.manager && branch.manager.id) {
        // Nếu đang edit và manager này thuộc branch đang edit -> bỏ qua (sẽ hiển thị riêng)
        if (this.editMode && this.currentBranch?.id === branch.id) {
          continue;
        }
        
        // Kiểm tra chưa có trong danh sách
        const exists = managers.some(m => m.id === branch.manager!.id);
        if (!exists) {
          managers.push({
            id: branch.manager.id,
            fullName: branch.manager.fullName || branch.manager.full_name || 'N/A',
            phoneNumber: branch.manager.phoneNumber || branch.manager.phone_number || '',
            email: ''
          });
        }
      }
    }
    
    return managers;
  }

  async onCityChange(): Promise<void> {
    this.form.wardId = '';
    if (!this.form.cityId) {
      this.wards = [];
      return;
    }
    try {
      // LocationsService expects a numeric cityId; convert if needed
      const cityIdNum = typeof this.form.cityId === 'string' ? Number(this.form.cityId) : this.form.cityId as number;
      this.wards = await this.locationService.getWardsByCityId(cityIdNum);
    } catch (err) {
      console.warn('[AdminBranches] onCityChange failed', err);
      this.wards = [];
    }
  }

  openCreateForm(): void {
    this.editMode = false;
    this.showForm = true;
    this.currentBranch = null;
    this.form = {
      name: '',
      phoneNumber: '',
      street: '',
      wardId: '',
      cityId: '',
      managerId: undefined,
      latitude: undefined,
      longitude: undefined,
      openTime: '05:00:00',
      closeTime: '23:00:00',
    };
    this.wards = [];
  }

  async openEditForm(branch: BranchDto): Promise<void> {
    this.editMode = true;
    this.showForm = true;
    this.currentBranch = branch;
    this.form = {
      id: branch.id,
      name: branch.name,
      phoneNumber: branch.phoneNumber || branch.phone_number || '',
      street: branch.address?.street ?? '',
      wardId: String(branch.address?.wardId ?? ''),
      cityId: String(branch.address?.cityId ?? ''),
      managerId: branch.managerId || branch.manager_id,
      latitude: branch.address?.latitude,
      longitude: branch.address?.longitude,
      openTime: branch.openTime || branch.open_time || '05:00:00',
      closeTime: branch.closeTime || branch.close_time || '23:00:00',
    };
    if (this.form.cityId) {
      await this.onCityChange();
    }
  }

  closeForm(): void {
    this.showForm = false;
    this.error = null;
    this.success = null;
  }

  async submitForm(): Promise<void> {
    this.error = null;
    this.success = null;

    if (!this.form.name.trim()) {
      this.error = 'Tên chi nhánh không được để trống.';
      return;
    }
    if (!this.form.phoneNumber.trim()) {
      this.error = 'Số điện thoại không được để trống.';
      return;
    }
    if (!this.form.cityId || !this.form.wardId) {
      this.error = 'Vui lòng chọn đầy đủ Tỉnh/Thành và Quận/Huyện.';
      return;
    }

    this.loading = true;
    try {
      if (this.editMode && this.form.id) {
        const dto: any = {
          name: this.form.name,
          phone_number: this.form.phoneNumber,
          street: this.form.street,
          wardId: Number(this.form.wardId),
          cityId: Number(this.form.cityId),
          manager_id: this.form.managerId || undefined,
          latitude: this.form.latitude,
          longitude: this.form.longitude,
          open_time: this.form.openTime,
          close_time: this.form.closeTime,
        };
        await this.branchService.update(this.form.id, dto);
        this.success = 'Cập nhật chi nhánh thành công!';
      } else {
        const dto: any = {
          name: this.form.name,
          phone_number: this.form.phoneNumber,
          street: this.form.street,
          wardId: Number(this.form.wardId),
          cityId: Number(this.form.cityId),
          manager_id: this.form.managerId || undefined,
          latitude: this.form.latitude,
          longitude: this.form.longitude,
          open_time: this.form.openTime,
          close_time: this.form.closeTime,
        };
        await this.branchService.create(dto);
        this.success = 'Tạo chi nhánh mới thành công!';
      }
      await this.loadBranches();
      await this.loadAvailableManagers();
      this.closeForm();
    } catch (err: any) {
      console.error('[AdminBranches] submitForm failed', err);
      this.error = err?.error?.message || err?.message || 'Không thể lưu chi nhánh.';
    } finally {
      this.loading = false;
    }
  }

  async deleteBranch(branch: BranchDto): Promise<void> {
    if (!confirm(`Bạn có chắc muốn xóa chi nhánh "${branch.name}"?`)) return;

    this.loading = true;
    this.error = null;
    try {
      await this.branchService.remove(branch.id);
      this.success = 'Đã xóa chi nhánh thành công!';
      await this.loadBranches();
      await this.loadAvailableManagers();
    } catch (err: any) {
      console.error('[AdminBranches] deleteBranch failed', err);
      this.error = err?.error?.message || err?.message || 'Không thể xóa chi nhánh.';
    } finally {
      this.loading = false;
    }
  }

  getCityName(cityId?: string | number): string {
    if (cityId === undefined || cityId === null || cityId === '') return 'N/A';
    const city = this.cities.find(c => String(c.id) === String(cityId));
    return city?.name ?? String(cityId);
  }

  getTotalFields(): number {
    return this.branches.reduce((sum, branch) => sum + (branch.fields?.length ?? 0), 0);
  }

  getManagerCount(): number {
    return this.branches.filter(b => b.manager).length;
  }

  getCityCount(): number {
    const cities = new Set(this.branches.map(b => b.address?.cityId).filter(Boolean));
    return cities.size;
  }

  openMapPicker(): void {
    this.showMapPicker = true;
  }

  onLocationSelected(location: { lat: number; lng: number; address?: string }): void {
    // Cập nhật form trực tiếp
    this.form.latitude = location.lat;
    this.form.longitude = location.lng;
    
    // Tự động điền địa chỉ từ bản đồ vào trường "Địa chỉ (Số nhà, tên đường)"
    if (location.address) {
      this.form.street = location.address;
    }
    
    this.showMapPicker = false;
    console.log('[AdminBranches] Location selected:', location, 'Street updated to:', this.form.street);
  }

  onMapPickerCancelled(): void {
    this.showMapPicker = false;
  }
}
