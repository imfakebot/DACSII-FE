import { Component, OnInit, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field } from '../services/fields.service';
import { LocationsService, City } from '../services/locations.service';

type CourtCategory = 'indoor' | 'outdoor' | 'pro';
type CourtFilter = CourtCategory | 'all';

@Component({
  selector: 'badminton-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule],
  templateUrl: './badminton-list.html',
  styleUrls: ['./badminton-list.scss']
})
export class BadmintonListComponent implements OnInit {
  @Input() presetType: string | null = null;
  @Input() pageTitle: string | null = null;

  fields: Field[] = [];
  query = '';
  selectedCity: string | null = null;
  courtFilter: CourtFilter = 'all';

  readonly courtLabels: Record<CourtCategory, string> = {
    indoor: 'Trong nhà',
    outdoor: 'Ngoài trời',
    pro: 'Chuẩn thi đấu'
  };

  citiesApi: City[] = [];
  private courtCache = new Map<string, CourtCategory | null>();
  private readonly badmintonKeywords = ['cầu lông', 'badminton', 'san cau long', 'shuttle', 'badminton court'];
  private readonly nonBadmintonKeywords = ['bóng đá', 'football', 'tennis', 'table tennis', 'ping pong', 'bóng bàn'];
  private readonly courtPatterns: Record<CourtCategory, RegExp> = {
    indoor: /(trong\s*nhà|indoor|phòng|nha\s*thi\s*đấu|nha\s*thi\s*dau)/i,
    outdoor: /(ngoài\s*trời|ngoai\s*troi|outdoor|sân\s*vườn|san\s*vuon)/i,
    pro: /(chuẩn\s*thi\s*đấu|chuan\s*thi\s*dau|PVC|thảm|tham|cao\s*cấp|premium)/i
  };
  private badmintonTypeIds = new Set<string>();
  private fieldTypeCourtMap = new Map<string, CourtCategory>();

  constructor(
    private router: Router,
    private fieldsService: FieldsService,
    private locationsService: LocationsService,
  ) {}

  async ngOnInit(){
    [this.fields, this.citiesApi] = await Promise.all([
      this.fieldsService.getFields(),
      this.locationsService.getCities().catch(()=>[])
    ]);
    if (this.presetType) {
      this.badmintonKeywords.unshift(this.presetType.toLowerCase());
    }
    this.computeTypeMetadata();
  }

  get cities(){
    const badmintonCities = this.badmintonFields.map(f => f.city).filter(Boolean) as string[];
    const apiNames = (this.citiesApi || []).map(c => c.name).filter(name => badmintonCities.includes(name));
    if (apiNames.length) return Array.from(new Set(apiNames));
    return Array.from(new Set(badmintonCities)).sort();
  }

  get displayedFields(){
    return this.badmintonFields.filter(f => {
      const matchesQuery = !this.query || (f.name + ' ' + (f.description||'')).toLowerCase().includes(this.query.toLowerCase());
      const matchesCity = !this.selectedCity || f.city === this.selectedCity;
      const court = this.getCourtBadge(f);
      const matchesCourt = this.courtFilter === 'all' || court === this.courtFilter;
      return matchesQuery && matchesCity && matchesCourt;
    });
  }

  get badmintonFields(){
    return this.fields.filter(f => this.isBadmintonField(f));
  }

  viewDetail(id: any){ this.router.navigate(['/detail', id]); }

  onHeroSearch(){ return; }

  setCourtFilter(filter: CourtFilter){
    this.courtFilter = filter;
  }

  getCourtBadge(field: Field): CourtCategory | null {
    if (!this.courtCache.has(field.id)) {
      this.courtCache.set(field.id, this.detectCourtCategory(field));
    }
    return this.courtCache.get(field.id) ?? null;
  }

  private detectCourtCategory(field: Field): CourtCategory | null {
    if (field.fieldTypeId && this.fieldTypeCourtMap.has(field.fieldTypeId)) {
      return this.fieldTypeCourtMap.get(field.fieldTypeId)!;
    }
    const labelHint = this.courtFromLabel(field.fieldType || field.type);
    if (labelHint) return labelHint;
    return this.courtFromText(this.normalize(field));
  }

  private courtFromLabel(label?: string | null): CourtCategory | null {
    if (!label) return null;
    const txt = label.toLowerCase();
    if (/indoor|trong\s*nhà/.test(txt)) return 'indoor';
    if (/outdoor|ngoài\s*trời/.test(txt)) return 'outdoor';
    if (/pvc|thi\s*đấu|pro|premium|cao\s*cấp/.test(txt)) return 'pro';
    return null;
  }

  private isBadmintonField(field: Field){
    const text = this.normalize(field);
    if (!text.trim()) return false;
    if (this.nonBadmintonKeywords.some(keyword => text.includes(keyword))) return false;
    if (field.fieldTypeId && this.badmintonTypeIds.size) {
      return this.badmintonTypeIds.has(field.fieldTypeId);
    }
    return this.matchesBadmintonLabel(field);
  }

  private normalize(field: Field){
    return `${field.name || ''} ${field.type || ''} ${field.fieldType || ''} ${field.description || ''}`.toLowerCase();
  }

  private computeTypeMetadata(){
    this.badmintonTypeIds.clear();
    this.fieldTypeCourtMap.clear();
    for (const field of this.fields){
      if (!field.fieldTypeId) continue;
      if (!this.fieldTypeCourtMap.has(field.fieldTypeId)) {
        const cat = this.courtFromLabel(field.fieldType || field.type) || this.courtFromText(this.normalize(field));
        if (cat) this.fieldTypeCourtMap.set(field.fieldTypeId, cat);
      }
      if (this.matchesBadmintonLabel(field)) {
        this.badmintonTypeIds.add(field.fieldTypeId);
      }
    }
  }

  private matchesBadmintonLabel(field: Field){
    const label = `${field.fieldType || ''} ${field.type || ''}`.toLowerCase();
    if (this.badmintonKeywords.some(keyword => label.includes(keyword))) return true;
    return this.badmintonKeywords.some(keyword => this.normalize(field).includes(keyword));
  }

  private courtFromText(text: string): CourtCategory | null {
    for (const key of Object.keys(this.courtPatterns) as CourtCategory[]) {
      if (this.courtPatterns[key].test(text)) return key;
    }
    return null;
  }
}
