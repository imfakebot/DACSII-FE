import { Component, OnInit } from "@angular/core";
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field } from '../services/fields.service';
import { IdEncoderService } from '../services/id-encoder.service';
 
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

  constructor(
    private fieldsService: FieldsService, 
    private router: Router,
    private idEncoder: IdEncoderService  // Service mã hóa ID
  ) {}

  async ngOnInit() {
    // Lấy dữ liệu sân từ service (gọi backend /api/fields qua proxy)
    this.fields = await this.fieldsService.getFields();
  }
  
  // Tạo link chi tiết với ID đã mã hóa
  getDetailLink(id: string): string[] {
    const encodedId = this.idEncoder.encode(id);
    return ['/detail', encodedId];
  }
  
  // 4 sân đầu làm 'Sân tập gần bạn'
  get nearFields(){
    if (!this.fields || this.fields.length === 0) return [];
    // Lọc toàn bộ theo môn trước rồi mới cắt 4, tránh trường hợp 8 phần tử đầu không trùng môn
    const filtered = this.applySportFilter(this.fields, this.selectedNear);
    return filtered.slice(0,4);
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
