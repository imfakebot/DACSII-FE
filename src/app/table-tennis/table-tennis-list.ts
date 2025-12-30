import { Component, OnInit, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field } from '../services/fields.service';
import { LocationsService, City } from '../services/locations.service';
import { IdEncoderService } from '../services/id-encoder.service';

type HallCategory = 'club' | 'training' | 'pro';
type HallFilter = HallCategory | 'all';

@Component({
  selector: 'table-tennis-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule],
  templateUrl: './table-tennis-list.html',
  styleUrls: ['./table-tennis-list.scss']
})
export class TableTennisListComponent implements OnInit {
  @Input() presetType: string | null = null;
  @Input() pageTitle: string | null = null;

  fields: Field[] = [];
  query = '';
  selectedCity: string | null = null;
  hallFilter: HallFilter = 'all';

  readonly hallLabels: Record<HallCategory, string> = {
    club: 'Club phong trào',
    training: 'Phòng tập luyện',
    pro: 'Giải đấu chuyên'
  };
  private hallEntriesCache: [HallCategory, string][] = [];

  citiesApi: City[] = [];
  private hallCache = new Map<string, HallCategory | null>();
  private readonly tableTennisKeywords = ['bóng bàn', 'table tennis', 'ping pong', 'san bong ban', 'phong bong ban'];
  private readonly nonTableTennisKeywords = ['bóng đá', 'football', 'tennis', 'cầu lông', 'badminton', 'futsal'];
  private readonly hallPatterns: Record<HallCategory, RegExp> = {
    club: /(club|phong\s*sinh\s*hoạt|phong\s*clb|open\s*club)/i,
    training: /(phòng\s*tập|phong\s*tap|training|luyện\s*tập|luyen\s*tap|học\s*viện)/i,
    pro: /(giải\s*đấu|giai\s*dau|chuẩn\s*thi\s*đấu|arena|nhiều\s*bàn|setup\s*pro)/i
  };
  private tableTennisTypeIds = new Set<string>();
  private fieldTypeHallMap = new Map<string, HallCategory>();

  constructor(
    private router: Router,
    private fieldsService: FieldsService,
    private locationsService: LocationsService,
    private idEncoder: IdEncoderService,  // Service mã hóa ID
  ) {}

  async ngOnInit(){
    [this.fields, this.citiesApi] = await Promise.all([
      this.fieldsService.getFields(),
      this.locationsService.getCities().catch(()=>[])
    ]);
    if (this.presetType) {
      this.tableTennisKeywords.unshift(this.presetType.toLowerCase());
    }
    this.computeTypeMetadata();
  }

  get hallEntries(): [HallCategory, string][] {
    if (!this.hallEntriesCache.length) {
      this.hallEntriesCache = Object.entries(this.hallLabels) as [HallCategory, string][];
    }
    return this.hallEntriesCache;
  }

  get cities(){
    const hallCities = this.tableTennisFields.map(f => f.city).filter(Boolean) as string[];
    const apiNames = (this.citiesApi || []).map(c => c.name).filter(name => hallCities.includes(name));
    if (apiNames.length) return Array.from(new Set(apiNames));
    return Array.from(new Set(hallCities)).sort();
  }

  get displayedFields(){
    return this.tableTennisFields.filter(f => {
      const matchesQuery = !this.query || (f.name + ' ' + (f.description||'')).toLowerCase().includes(this.query.toLowerCase());
      const matchesCity = !this.selectedCity || f.city === this.selectedCity;
      const hall = this.getHallBadge(f);
      const matchesHall = this.hallFilter === 'all' || hall === this.hallFilter;
      return matchesQuery && matchesCity && matchesHall;
    });
  }

  get tableTennisFields(){
    return this.fields.filter(f => this.isTableTennisField(f));
  }

  viewDetail(id: any){ 
    const encodedId = this.idEncoder.encode(id);  // Mã hóa ID trước khi hiển thị URL
    this.router.navigate(['/detail', encodedId]); 
  }

  onHeroSearch(){ return; }

  setHallFilter(filter: HallFilter){
    this.hallFilter = filter;
  }

  getHallBadge(field: Field): HallCategory | null {
    if (!this.hallCache.has(field.id)) {
      this.hallCache.set(field.id, this.detectHallCategory(field));
    }
    return this.hallCache.get(field.id) ?? null;
  }

  private detectHallCategory(field: Field): HallCategory | null {
    if (field.fieldTypeId && this.fieldTypeHallMap.has(field.fieldTypeId)) {
      return this.fieldTypeHallMap.get(field.fieldTypeId)!;
    }
    const labelHint = this.hallFromLabel(field.fieldType || field.type);
    if (labelHint) return labelHint;
    return this.hallFromText(this.normalize(field));
  }

  private hallFromLabel(label?: string | null): HallCategory | null {
    if (!label) return null;
    const txt = label.toLowerCase();
    if (/club|clb|phong\s*clb/.test(txt)) return 'club';
    if (/training|tập|tap|academy/.test(txt)) return 'training';
    if (/pro|thi\s*đấu|arena|champ/.test(txt)) return 'pro';
    return null;
  }

  private isTableTennisField(field: Field){
    const text = this.normalize(field);
    if (!text.trim()) return false;
    if (this.nonTableTennisKeywords.some(keyword => text.includes(keyword))) return false;
    if (field.fieldTypeId && this.tableTennisTypeIds.size) {
      return this.tableTennisTypeIds.has(field.fieldTypeId);
    }
    return this.matchesTableTennisLabel(field);
  }

  private normalize(field: Field){
    return `${field.name || ''} ${field.type || ''} ${field.fieldType || ''} ${field.description || ''}`.toLowerCase();
  }

  private computeTypeMetadata(){
    this.tableTennisTypeIds.clear();
    this.fieldTypeHallMap.clear();
    for (const field of this.fields){
      if (!field.fieldTypeId) continue;
      if (!this.fieldTypeHallMap.has(field.fieldTypeId)) {
        const hall = this.hallFromLabel(field.fieldType || field.type) || this.hallFromText(this.normalize(field));
        if (hall) this.fieldTypeHallMap.set(field.fieldTypeId, hall);
      }
      if (this.matchesTableTennisLabel(field)) {
        this.tableTennisTypeIds.add(field.fieldTypeId);
      }
    }
  }

  private matchesTableTennisLabel(field: Field){
    const label = `${field.fieldType || ''} ${field.type || ''}`.toLowerCase();
    if (this.tableTennisKeywords.some(keyword => label.includes(keyword))) return true;
    return this.tableTennisKeywords.some(keyword => this.normalize(field).includes(keyword));
  }

  private hallFromText(text: string): HallCategory | null {
    for (const key of Object.keys(this.hallPatterns) as HallCategory[]) {
      if (this.hallPatterns[key].test(text)) return key;
    }
    return null;
  }
}
