import { Component, OnInit, Input } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field } from '../services/fields.service';
import { LocationsService, City } from '../services/locations.service';
import { IdEncoderService } from '../services/id-encoder.service';

/*
  FieldsListComponent (Tiếng Việt):
  - Hiển thị danh sách các sân dưới dạng lưới các card
  - Dùng class chung `.grid`, `.card` được định nghĩa trong `app.scss`
*/
type PitchCategory = '5p' | '7p' | '11p';
type PitchFilter = PitchCategory | 'all';

@Component({
  selector: 'fields-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule],
  templateUrl: './football-list.html',
  styleUrls: ['./football-list.scss']
})

export class FieldsListComponent implements OnInit {
  // Tuỳ chọn cấu hình trước loại sân và tiêu đề trang (giữ cho tương thích ngược)
  @Input() presetType: string | null = null;
  @Input() pageTitle: string | null = null;
  // Dữ liệu sân
  fields: Field[] = [];
  // Trường dùng cho tìm kiếm và lọc (client-side)
  query = '';
  selectedCity: string | null = null;
  pitchFilter: PitchFilter = 'all';

  readonly pitchLabels: Record<PitchCategory, string> = {
    '5p': 'Sân 5 người',
    '7p': 'Sân 7 người',
    '11p': 'Sân 11 người',
  };

  citiesApi: City[] = [];
  private pitchCache = new Map<string, PitchCategory | null>();
  private readonly footballKeywords = ['bóng đá', 'bong da', 'football', 'futsal', 'sân bóng đá', 'san bong da', 'soccer'];
  private readonly nonFootballKeywords = ['bóng bàn', 'bong ban', 'tennis', 'cầu lông', 'cau long', 'bóng rổ', 'bong ro', 'bóng chuyền', 'bong chuyen', 'table tennis', 'badminton', 'basketball'];
  private readonly pitchPatterns: Record<PitchCategory, RegExp> = {
    '5p': /(5\s*(người|nguoi|vs|v|p|people|player)\b|sân\s*5\b|san\s*5\b|5v5|five\s*a\s*side|mini\s*5)/i,
    '7p': /(7\s*(người|nguoi|vs|v|p|people|player)\b|sân\s*7\b|san\s*7\b|7v7|seven\s*a\s*side|mini\s*7)/i,
    '11p': /(11\s*(người|nguoi|vs|v|p|people|player)\b|sân\s*11\b|san\s*11\b|11v11|eleven\s*a\s*side|full\s*size|sân\s*11\s*người|san\s*11\s*nguoi)/i,
  };
  private footballTypeIds = new Set<string>();
  private fieldTypePitchMap = new Map<string, PitchCategory>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fieldsService: FieldsService,
    private locationsService: LocationsService,
    private idEncoder: IdEncoderService,  // Service mã hóa ID
  ) {}

  async ngOnInit(){
    // load fields and cities in parallel
    [this.fields, this.citiesApi] = await Promise.all([
      this.fieldsService.getFields(),
      this.locationsService.getCities().catch(()=>[])
    ]);
    // Nếu presetType được truyền vào thì ưu tiên dùng để nhận dạng sân bóng đá theo type cụ thể
    if (this.presetType) {
      this.footballKeywords.unshift(this.presetType.toLowerCase());
    }
    this.computeTypeMetadata();
    
    // Đọc query params từ URL (từ trang chủ tìm kiếm)
    this.route.queryParams.subscribe(params => {
      // Đọc search query
      if (params['q']) {
        this.query = params['q'];
      }
      // Đọc location filter
      if (params['location']) {
        // Map location code sang tên thành phố thực
        const locationMap: Record<string, string> = {
          'hanoi': 'Hà Nội',
          'hcm': 'TP. Hồ Chí Minh',
          'danang': 'Đà Nẵng',
          'hochiminh': 'TP. Hồ Chí Minh',
          'tphcm': 'TP. Hồ Chí Minh'
        };
        const locationKey = params['location'].toLowerCase();
        // Tìm city match với location param
        const mappedCity = locationMap[locationKey];
        if (mappedCity) {
          // Tìm trong danh sách cities hiện có
          const matchedCity = this.cities.find(c => 
            this.normalizeVietnamese(c).includes(this.normalizeVietnamese(mappedCity))
          );
          this.selectedCity = matchedCity || null;
        } else {
          // Thử match trực tiếp với tên thành phố
          const matchedCity = this.cities.find(c => 
            this.normalizeVietnamese(c).includes(this.normalizeVietnamese(params['location']))
          );
          this.selectedCity = matchedCity || null;
        }
      }
    });
  }
  
  // Helper: chuẩn hóa tiếng Việt để so sánh
  private normalizeVietnamese(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .trim();
  }

  // Lấy danh sách thành phố hiện có
  get cities(){
    // Prefer API cities nhưng chỉ giữ các thành phố đang có sân bóng đá
    const footballCities = this.footballFields.map(f => f.city).filter(Boolean) as string[];
    const apiNames = (this.citiesApi || []).map(c => c.name).filter(name => footballCities.includes(name));
    if (apiNames.length) return Array.from(new Set(apiNames));
    return Array.from(new Set(footballCities)).sort();
  }

  // Danh sách sân sau khi áp filter/search
  get displayedFields(){
    return this.footballFields.filter(f => {
      // Tìm kiếm theo tên, mô tả, địa chỉ, quận/huyện
      const searchText = this.normalizeVietnamese(
        `${f.name || ''} ${f.description || ''} ${f.street || ''} ${f.ward || ''} ${f.city || ''}`
      );
      const queryNormalized = this.normalizeVietnamese(this.query);
      const matchesQuery = !this.query || searchText.includes(queryNormalized);
      
      // Lọc theo thành phố
      const matchesCity = !this.selectedCity || f.city === this.selectedCity;
      
      // Lọc theo loại sân (5/7/11 người)
      const pitch = this.getPitchBadge(f);
      const matchesPitch = this.pitchFilter === 'all' || pitch === this.pitchFilter;
      
      return matchesQuery && matchesCity && matchesPitch;
    });
  }

  get footballFields(){
    return this.fields.filter(f => this.isFootballField(f));
  }

  viewDetail(id: any){ 
    const encodedId = this.idEncoder.encode(id);  // Mã hóa ID trước khi hiển thị URL
    this.router.navigate(['/detail', encodedId]); 
  }
  bookNow(id: any){ 
    const encodedId = this.idEncoder.encode(id);
    this.router.navigate(['/booking'], { queryParams: { fieldId: encodedId } }); 
  }

  // Xử lý nút tìm ở hero (hiện chỉ focus vào search)
  onHeroSearch(){
    // hiện tại không cần làm gì thêm; giữ để template không lỗi
    // tương lai có thể trigger tìm nâng cao hoặc chuyển focus
    return;
  }

  setPitchFilter(filter: PitchFilter){
    this.pitchFilter = filter;
  }

  getPitchBadge(field: Field): PitchCategory | null {
    if (!this.pitchCache.has(field.id)) {
      this.pitchCache.set(field.id, this.detectPitchSize(field));
    }
    return this.pitchCache.get(field.id) ?? null;
  }

  private detectPitchSize(field: Field): PitchCategory | null {
    if (field.fieldTypeId && this.fieldTypePitchMap.has(field.fieldTypeId)) {
      return this.fieldTypePitchMap.get(field.fieldTypeId)!;
    }
    const typeHint = this.sizeFromType(field.fieldType || field.type);
    if (typeHint) return typeHint;
    return this.detectPitchFromText(this.normalize(field));
  }

  private sizeFromType(type?: string | null): PitchCategory | null {
    if (!type) return null;
    const txt = type.toLowerCase();
    if (/11|full/.test(txt)) return '11p';
    if (/7\b|seven/.test(txt)) return '7p';
    if (/5\b|five/.test(txt)) return '5p';
    return null;
  }

  private isFootballField(field: Field){
    const text = this.normalize(field);
    if (!text.trim()) return false;
    if (this.nonFootballKeywords.some(keyword => text.includes(keyword))) return false;
    if (field.fieldTypeId && this.footballTypeIds.size) {
      return this.footballTypeIds.has(field.fieldTypeId);
    }
    return this.matchesFootballLabel(field);
  }

  private normalize(field: Field){
    return `${field.name || ''} ${field.type || ''} ${field.fieldType || ''} ${field.description || ''}`.toLowerCase();
  }

  private computeTypeMetadata(){
    this.footballTypeIds.clear();
    this.fieldTypePitchMap.clear();
    for (const field of this.fields){
      if (!field.fieldTypeId) continue;
      if (!this.fieldTypePitchMap.has(field.fieldTypeId)) {
        const pitch = this.sizeFromType(field.fieldType || field.type) || this.detectPitchFromText(this.normalize(field));
        if (pitch) this.fieldTypePitchMap.set(field.fieldTypeId, pitch);
      }
      if (this.matchesFootballLabel(field)) {
        this.footballTypeIds.add(field.fieldTypeId);
      }
    }
  }

  private matchesFootballLabel(field: Field){
    const label = `${field.fieldType || ''} ${field.type || ''}`.toLowerCase();
    if (this.footballKeywords.some(keyword => label.includes(keyword))) return true;
    if (/(sân|san)\s*(5|7|11)\b/.test(label)) return true;
    return this.footballKeywords.some(keyword => this.normalize(field).includes(keyword));
  }

  private detectPitchFromText(text: string): PitchCategory | null {
    for (const key of Object.keys(this.pitchPatterns) as PitchCategory[]) {
      if (this.pitchPatterns[key].test(text)) return key;
    }
    if (/\b11(p|\s*nguoi|\s*people|\s*players)?\b/.test(text)) return '11p';
    if (/\b7(p|\s*nguoi|\s*people|\s*players)?\b/.test(text)) return '7p';
    if (/\b5(p|\s*nguoi|\s*people|\s*players)?\b/.test(text)) return '5p';
    return null;
  }
}