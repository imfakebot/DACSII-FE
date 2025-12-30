import { Component, OnInit, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field } from '../services/fields.service';
import { LocationsService, City } from '../services/locations.service';
import { IdEncoderService } from '../services/id-encoder.service';

type CourtSurface = 'hard' | 'clay' | 'grass';
type CourtFilter = CourtSurface | 'all';

@Component({
  selector: 'tennis-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule],
  templateUrl: './tennis-list.html',
  styleUrls: ['./tennis-list.scss']
})
export class TennisListComponent implements OnInit {
  @Input() presetType: string | null = null;
  @Input() pageTitle: string | null = null;

  fields: Field[] = [];
  query = '';
  selectedCity: string | null = null;
  surfaceFilter: CourtFilter = 'all';

  readonly surfaceLabels: Record<CourtSurface, string> = {
    hard: 'Sân cứng',
    clay: 'Sân đất nện',
    grass: 'Sân cỏ'
  };

  citiesApi: City[] = [];
  private surfaceCache = new Map<string, CourtSurface | null>();
  private readonly tennisKeywords = ['tennis', 'tenis', 'quần vợt', 'quan vot', 'sân tennis', 'tennis court'];
  private readonly nonTennisKeywords = ['bóng đá', 'football', 'futsal', 'cầu lông', 'badminton', 'bóng bàn', 'table tennis', 'ping pong'];
  private readonly surfacePatterns: Record<CourtSurface, RegExp> = {
    hard: /(hard court|sân\s*cứng|san\s*cung|acrylic|bê\s*tông|be\s*tong|indoor hard)/i,
    clay: /(clay|đất\s*nện|dat\s*nen|sân\s*đất|san\s*dat)/i,
    grass: /(grass court|sân\s*cỏ\s*tennis|san\s*co\s*tennis|cỏ\s*nhiên|co\s*nhan)/i
  };
  private tennisTypeIds = new Set<string>();
  private fieldTypeSurfaceMap = new Map<string, CourtSurface>();

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
      this.tennisKeywords.unshift(this.presetType.toLowerCase());
    }
    this.computeTypeMetadata();
  }

  get cities(){
    const tennisCities = this.tennisFields.map(f => f.city).filter(Boolean) as string[];
    const apiNames = (this.citiesApi || []).map(c => c.name).filter(name => tennisCities.includes(name));
    if (apiNames.length) return Array.from(new Set(apiNames));
    return Array.from(new Set(tennisCities)).sort();
  }

  get displayedFields(){
    return this.tennisFields.filter(f => {
      const matchesQuery = !this.query || (f.name + ' ' + (f.description||'')).toLowerCase().includes(this.query.toLowerCase());
      const matchesCity = !this.selectedCity || f.city === this.selectedCity;
      const surface = this.getSurfaceBadge(f);
      const matchesSurface = this.surfaceFilter === 'all' || surface === this.surfaceFilter;
      return matchesQuery && matchesCity && matchesSurface;
    });
  }

  get tennisFields(){
    return this.fields.filter(f => this.isTennisField(f));
  }

  viewDetail(id: any){ 
    const encodedId = this.idEncoder.encode(id);  // Mã hóa ID trước khi hiển thị URL
    this.router.navigate(['/detail', encodedId]); 
  }

  onHeroSearch(){ return; }

  setSurfaceFilter(filter: CourtFilter){
    this.surfaceFilter = filter;
  }

  getSurfaceBadge(field: Field): CourtSurface | null {
    if (!this.surfaceCache.has(field.id)) {
      this.surfaceCache.set(field.id, this.detectSurface(field));
    }
    return this.surfaceCache.get(field.id) ?? null;
  }

  private detectSurface(field: Field): CourtSurface | null {
    if (field.fieldTypeId && this.fieldTypeSurfaceMap.has(field.fieldTypeId)) {
      return this.fieldTypeSurfaceMap.get(field.fieldTypeId)!;
    }
    const surfaceHint = this.surfaceFromLabel(field.fieldType || field.type);
    if (surfaceHint) return surfaceHint;
    return this.surfaceFromText(this.normalize(field));
  }

  private surfaceFromLabel(label?: string | null): CourtSurface | null {
    if (!label) return null;
    const txt = label.toLowerCase();
    if (/hard|cứng|acrylic|betong|bê\s*tông/.test(txt)) return 'hard';
    if (/clay|đất|dat|nen/.test(txt)) return 'clay';
    if (/grass|cỏ|co/.test(txt)) return 'grass';
    return null;
  }

  private isTennisField(field: Field){
    const text = this.normalize(field);
    if (!text.trim()) return false;
    if (this.nonTennisKeywords.some(keyword => text.includes(keyword))) return false;
    if (field.fieldTypeId && this.tennisTypeIds.size) {
      return this.tennisTypeIds.has(field.fieldTypeId);
    }
    return this.matchesTennisLabel(field);
  }

  private normalize(field: Field){
    return `${field.name || ''} ${field.type || ''} ${field.fieldType || ''} ${field.description || ''}`.toLowerCase();
  }

  private computeTypeMetadata(){
    this.tennisTypeIds.clear();
    this.fieldTypeSurfaceMap.clear();
    for (const field of this.fields){
      if (!field.fieldTypeId) continue;
      if (!this.fieldTypeSurfaceMap.has(field.fieldTypeId)) {
        const surface = this.surfaceFromLabel(field.fieldType || field.type) || this.surfaceFromText(this.normalize(field));
        if (surface) this.fieldTypeSurfaceMap.set(field.fieldTypeId, surface);
      }
      if (this.matchesTennisLabel(field)) {
        this.tennisTypeIds.add(field.fieldTypeId);
      }
    }
  }

  private matchesTennisLabel(field: Field){
    const label = `${field.fieldType || ''} ${field.type || ''}`.toLowerCase();
    if (this.tennisKeywords.some(keyword => label.includes(keyword))) return true;
    return this.tennisKeywords.some(keyword => this.normalize(field).includes(keyword));
  }

  private surfaceFromText(text: string): CourtSurface | null {
    for (const key of Object.keys(this.surfacePatterns) as CourtSurface[]) {
      if (this.surfacePatterns[key].test(text)) return key;
    }
    return null;
  }
}
