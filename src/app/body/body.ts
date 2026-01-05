import { Component, OnInit, Inject, PLATFORM_ID } from "@angular/core";
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field } from '../services/fields.service';
import { IdEncoderService } from '../services/id-encoder.service';

interface UserLocation {
  latitude: number;
  longitude: number;
}

@Component({
  selector: "app-body",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: "./body.html",
  styleUrls: ["./body.scss"]
})
export class BodyComponent implements OnInit {
  fields: Field[] = [];
  // Môn thể thao đang chọn cho từng section (độc lập)
  selectedNear: 'football' | 'tennis' | 'badminton' | 'tabletennis' | 'all' = 'football';
  selectedRecommend: 'football' | 'tennis' | 'badminton' | 'tabletennis' | 'all' = 'football';
  selectedTop: 'football' | 'tennis' | 'badminton' | 'tabletennis' | 'all' = 'football';
  
  // Tìm kiếm
  searchQuery: string = '';
  searchSport: string = '';
  searchLocation: string = '';

  // Vị trí người dùng
  userLocation: UserLocation | null = null;
  locationStatus: 'idle' | 'pending' | 'granted' | 'denied' | 'unavailable' = 'idle';
  locationCity: string = '';
  cityAliases: string[] = [];
  
  // Cho phép user chọn thành phố thủ công
  selectedCityManual: string = ''; // Thành phố user chọn
  isManualLocation: boolean = false; // true nếu user chọn thủ công
  
  // Danh sách thành phố hỗ trợ
  availableCities = [
    { value: '', label: 'Tự động detect' },
    { value: 'danang', label: 'Đà Nẵng', aliases: ['da nang', 'đà nẵng', 'danang'] },
    { value: 'hcm', label: 'TP. Hồ Chí Minh', aliases: ['hcm', 'ho chi minh', 'hồ chí minh', 'sài gòn', 'saigon'] },
    { value: 'hanoi', label: 'Hà Nội', aliases: ['ha noi', 'hà nội', 'hanoi'] },
    { value: 'hue', label: 'Huế', aliases: ['hue', 'huế', 'thua thien hue'] },
    { value: 'nhatrang', label: 'Nha Trang', aliases: ['nha trang', 'khanh hoa'] },
    { value: 'cantho', label: 'Cần Thơ', aliases: ['can tho', 'cần thơ'] },
  ];

  private isBrowser: boolean;

  constructor(
    private fieldsService: FieldsService, 
    private router: Router,
    private idEncoder: IdEncoderService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    // Lấy dữ liệu sân từ service (gọi backend /api/fields qua proxy)
    this.fields = await this.fieldsService.getFields();
    
    // Kiểm tra xem user đã chọn thành phố thủ công trước đó chưa
    if (this.isBrowser) {
      const savedCity = localStorage.getItem('selectedCity');
      if (savedCity) {
        this.onCityChange(savedCity);
      } else {
        // Nếu chưa chọn, thử detect tự động
        this.requestLocationPermission();
      }
    }
  }

  /**
   * Khi user chọn thành phố từ dropdown
   */
  onCityChange(cityValue: string): void {
    this.selectedCityManual = cityValue;
    
    if (cityValue === '') {
      // User chọn "Tự động detect"
      this.isManualLocation = false;
      this.locationCity = '';
      this.cityAliases = [];
      localStorage.removeItem('selectedCity');
      this.requestLocationPermission();
    } else {
      // User chọn thành phố cụ thể
      this.isManualLocation = true;
      const city = this.availableCities.find(c => c.value === cityValue);
      if (city && city.value !== '') {
        this.locationCity = city.label;
        this.cityAliases = city.aliases || [];
        this.locationStatus = 'granted';
        localStorage.setItem('selectedCity', cityValue);
        console.log('[Body] Manual city selected:', this.locationCity);
      }
    }
  }

  /**
   * Yêu cầu quyền truy cập vị trí người dùng
   */
  requestLocationPermission(): void {
    if (!navigator.geolocation) {
      this.locationStatus = 'unavailable';
      console.warn('[Body] Geolocation is not supported by this browser.');
      return;
    }

    this.locationStatus = 'pending';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        this.locationStatus = 'granted';
        
        // Log chi tiết để debug
        console.log('[Body] ========== GEOLOCATION DEBUG ==========');
        console.log('[Body] Latitude:', position.coords.latitude);
        console.log('[Body] Longitude:', position.coords.longitude);
        console.log('[Body] Accuracy:', position.coords.accuracy, 'meters');
        console.log('[Body] Google Maps link: https://www.google.com/maps?q=' + 
          position.coords.latitude + ',' + position.coords.longitude);
        console.log('[Body] =========================================');
        
        // Tìm thành phố gần nhất dựa trên tọa độ
        this.detectCityFromCoords();
      },
      (error) => {
        this.locationStatus = 'denied';
        console.warn('[Body] Geolocation error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Không cache, lấy vị trí mới nhất
      }
    );
  }

  /**
   * Tính khoảng cách giữa 2 điểm (Haversine formula) - đơn vị km
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Detect thành phố từ tọa độ user (Reverse Geocoding)
   * Sử dụng các khoảng tọa độ đã biết của các thành phố lớn ở VN
   */
  private detectCityFromCoords(): void {
    if (!this.userLocation) return;
    
    const { latitude, longitude } = this.userLocation;
    
    // Định nghĩa vùng tọa độ của các thành phố lớn
    const cities = [
      { 
        name: 'Đà Nẵng', 
        aliases: ['da nang', 'đà nẵng', 'danang'],
        lat: { min: 15.9, max: 16.2 }, 
        lon: { min: 108.0, max: 108.35 } 
      },
      { 
        name: 'TP. Hồ Chí Minh', 
        aliases: ['hcm', 'ho chi minh', 'hồ chí minh', 'tp hcm', 'sài gòn', 'saigon'],
        lat: { min: 10.6, max: 11.2 }, 
        lon: { min: 106.4, max: 107.0 } 
      },
      { 
        name: 'Hà Nội', 
        aliases: ['ha noi', 'hà nội', 'hanoi'],
        lat: { min: 20.8, max: 21.2 }, 
        lon: { min: 105.7, max: 106.0 } 
      },
      { 
        name: 'Huế', 
        aliases: ['hue', 'huế', 'thua thien hue'],
        lat: { min: 16.3, max: 16.6 }, 
        lon: { min: 107.4, max: 107.8 } 
      },
      { 
        name: 'Nha Trang', 
        aliases: ['nha trang', 'khanh hoa'],
        lat: { min: 12.1, max: 12.4 }, 
        lon: { min: 109.1, max: 109.3 } 
      },
      { 
        name: 'Cần Thơ', 
        aliases: ['can tho', 'cần thơ'],
        lat: { min: 10.0, max: 10.2 }, 
        lon: { min: 105.7, max: 105.9 } 
      },
      { 
        name: 'Hải Phòng', 
        aliases: ['hai phong', 'hải phòng'],
        lat: { min: 20.8, max: 20.95 }, 
        lon: { min: 106.6, max: 106.8 } 
      },
    ];
    
    // Tìm thành phố chứa tọa độ user
    for (const city of cities) {
      if (latitude >= city.lat.min && latitude <= city.lat.max &&
          longitude >= city.lon.min && longitude <= city.lon.max) {
        this.locationCity = city.name;
        this.cityAliases = city.aliases;
        console.log('[Body] Detected city from coords:', this.locationCity, 
          `(lat: ${latitude.toFixed(4)}, lon: ${longitude.toFixed(4)})`);
        return;
      }
    }
    
    // Nếu không match city nào, tìm city gần nhất dựa trên khoảng cách
    const cityCenters = [
      { name: 'Đà Nẵng', aliases: ['da nang', 'đà nẵng', 'danang'], lat: 16.0544, lon: 108.2022 },
      { name: 'TP. Hồ Chí Minh', aliases: ['hcm', 'ho chi minh', 'hồ chí minh'], lat: 10.8231, lon: 106.6297 },
      { name: 'Hà Nội', aliases: ['ha noi', 'hà nội', 'hanoi'], lat: 21.0285, lon: 105.8542 },
    ];
    
    let nearestCity = cityCenters[0];
    let minDist = Infinity;
    
    for (const city of cityCenters) {
      const dist = this.calculateDistance(latitude, longitude, city.lat, city.lon);
      if (dist < minDist) {
        minDist = dist;
        nearestCity = city;
      }
    }
    
    this.locationCity = nearestCity.name;
    this.cityAliases = nearestCity.aliases;
    console.log('[Body] Nearest city (fallback):', this.locationCity, `(${minDist.toFixed(1)}km away)`);
  }

  /**
   * Lấy khoảng cách từ user đến sân (nếu có tọa độ)
   */
  getDistanceToField(field: Field): number | null {
    if (!this.userLocation || !field.latitude || !field.longitude) {
      return null;
    }
    return this.calculateDistance(
      this.userLocation.latitude,
      this.userLocation.longitude,
      field.latitude,
      field.longitude
    );
  }

  /**
   * Format khoảng cách để hiển thị
   */
  formatDistance(km: number | null): string {
    if (km === null) return '';
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  }
  
  // Tạo link chi tiết với ID đã mã hóa
  getDetailLink(id: string): string[] {
    const encodedId = this.idEncoder.encode(id);
    return ['/detail', encodedId];
  }
  
  // Sân tập gần bạn - sắp xếp theo khoảng cách nếu có vị trí
  get nearFields(){
    if (!this.fields || this.fields.length === 0) return [];
    
    let filtered = this.applySportFilter(this.fields, this.selectedNear);
    
    // Nếu có vị trí người dùng, ưu tiên sân cùng thành phố và sắp xếp theo khoảng cách
    if (this.userLocation && this.locationCity) {
      // Filter sân cùng thành phố sử dụng aliases
      const sameCityFields = filtered.filter(f => {
        if (!f.city) return false;
        const fieldCityLower = f.city.toLowerCase();
        
        // Check exact match hoặc aliases
        if (fieldCityLower.includes(this.locationCity.toLowerCase())) return true;
        if (this.locationCity.toLowerCase().includes(fieldCityLower)) return true;
        
        // Check aliases
        for (const alias of this.cityAliases) {
          if (fieldCityLower.includes(alias) || alias.includes(fieldCityLower)) {
            return true;
          }
        }
        return false;
      });
      
      console.log('[Body] Fields in same city:', sameCityFields.length, 'out of', filtered.length);
      
      if (sameCityFields.length > 0) {
        filtered = sameCityFields;
      }
      
      // Sắp xếp theo khoảng cách (sân có tọa độ lên trước)
      filtered = [...filtered].sort((a, b) => {
        const distA = this.getDistanceToField(a);
        const distB = this.getDistanceToField(b);
        
        // Sân có tọa độ ưu tiên hơn
        if (distA !== null && distB !== null) {
          return distA - distB;
        }
        if (distA !== null) return -1;
        if (distB !== null) return 1;
        return 0;
      });
    }
    
    return filtered.slice(0, 4);
  }

  // Top fields theo đánh giá trung bình (avgRating) — nếu không có rating, coi là 0
  get topFields(){
    if(!this.fields || this.fields.length===0) return [];
    const sorted = [...this.fields]
      .sort((a,b) => (Number(b.avgRating||0) - Number(a.avgRating||0)));
    return this.applySportFilter(sorted, this.selectedTop).slice(0,4);
  }

  // Đề xuất: ưu tiên cùng thành phố với sân đầu tiên, nếu không có thì random
  get recommendedFields(){
    if(!this.fields || this.fields.length===0) return [];
    // Độc lập với các section khác: không loại trừ near/top
    const filtered = this.applySportFilter(this.fields, this.selectedRecommend);
    if (filtered.length === 0) return [];
    const city = filtered[0]?.city;
    if (city) {
      const sameCity = filtered.filter(f => f.city === city);
      if (sameCity.length > 0) return sameCity.slice(0,4);
    }
    return filtered.slice(0,4);
  }

  // Heuristic: detect sport from many text fields (type, fieldType, name, description)
  // Normalize by removing diacritics and lowercasing so comparisons match backend variants.
  private normalizeText(s: string): string {
    return (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[_\-]/g, ' ');
  }

  private detectSport(f: Field): 'football'|'tennis'|'badminton'|'tabletennis' {
    const combined = `${f.type || ''} ${f.fieldType || ''} ${f.name || ''} ${f.description || ''}`;
    const t = this.normalizeText(combined);

    // Keywords tuned to common backend values (both Vietnamese and English, ascii/no-accent)
    const tennisKeys = ['tennis', 'quan vot', 'quanvot'];
    const badmintonKeys = ['cau long', 'cau-long', 'badminton'];
    const tableTennisKeys = ['bong ban', 'bong-ban', 'table tennis', 'tabletennis', 'ping pong', 'pingpong'];
    const footballKeys = ['bong da', 'bong-da', 'football', 'soccer', 'san 5', 'san5', 'san 7', 'san7', 'futsal'];

    if (tennisKeys.some(k => t.includes(k))) return 'tennis';
    if (badmintonKeys.some(k => t.includes(k))) return 'badminton';
    if (tableTennisKeys.some(k => t.includes(k))) return 'tabletennis';
    if (footballKeys.some(k => t.includes(k))) return 'football';

    // Fallback: if nothing matches, default to football (most common in dataset)
    return 'football';
  }

  // Simplified equality check: compare detected sport to canonical keyword
  private typeEq(f: Field, keyword: 'football'|'tennis'|'badminton'|'tabletennis'): boolean {
    return this.detectSport(f) === keyword;
  }

  get footballFields(){
    return this.fields.filter(f => this.typeEq(f, 'football'));
  }
  get tennisFields(){
    return this.fields.filter(f => this.typeEq(f, 'tennis'));
  }
  get badmintonFields(){
    return this.fields.filter(f => this.typeEq(f, 'badminton'));
  }

  // Áp dụng lọc theo môn thể thao hiện chọn
  private applySportFilter(list: Field[], selected: 'football'|'tennis'|'badminton'|'tabletennis'|'all'): Field[] {
    switch (selected) {
      case 'football':
        return list.filter(f => this.typeEq(f, 'football'));
      case 'tennis':
        return list.filter(f => this.typeEq(f, 'tennis'));
      case 'badminton':
        return list.filter(f => this.typeEq(f, 'badminton'));
      case 'tabletennis':
        return list.filter(f => this.typeEq(f, 'tabletennis'));
      case 'all':
      default:
        return list;
    }
  }

  // Handlers khi click tag cho từng section
  setNearSport(s: 'football'|'tennis'|'badminton'|'tabletennis'|'all'){
    this.selectedNear = s;
  }
  setRecommendSport(s: 'football'|'tennis'|'badminton'|'tabletennis'|'all'){
    this.selectedRecommend = s;
  }
  setTopSport(s: 'football'|'tennis'|'badminton'|'tabletennis'|'all'){
    this.selectedTop = s;
  }

  // Xử lý tìm kiếm
  onSearch() {
    // Tạo params cho URL
    const params: any = {};
    if (this.searchQuery) params.q = this.searchQuery;
    if (this.searchSport) params.sport = this.searchSport;
    if (this.searchLocation) params.location = this.searchLocation;

    // Chuyển đến trang list với query params
    const sportRoute = this.searchSport || 'football';
    this.router.navigate([`/${sportRoute}`], { queryParams: params });
  }
}
