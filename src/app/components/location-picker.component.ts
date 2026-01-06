import { Component, EventEmitter, Input, Output, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="location-picker-overlay">
      <div class="location-picker">
        <div class="picker-header">
          <div class="header-content">
            <div class="header-icon">📍</div>
            <div>
              <h4>Chọn vị trí trên bản đồ</h4>
              <p class="picker-hint">Click vào bản đồ để chọn vị trí, hoặc kéo marker đỏ</p>
            </div>
          </div>
        </div>
        
        <div class="search-box" *ngIf="isBrowser">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              #searchInput
              placeholder="Tìm kiếm địa chỉ (VD: 123 Nguyễn Huệ, Quận 1, TP.HCM)"
              class="search-input"
              (keyup.enter)="searchAddress(searchInput.value)"
            />
          </div>
          <button type="button" class="search-btn" (click)="searchAddress(searchInput.value)">
            Tìm
          </button>
        </div>

        <div id="map" class="map-container"></div>
        
        <div class="coordinates-display" *ngIf="selectedLocation">
          <div class="coord-card">
            <div class="coord-icon">🌍</div>
            <div class="coord-details">
              <div class="coord-label">Vĩ độ</div>
              <div class="coord-value">{{ getLatDisplay() }}</div>
            </div>
          </div>
          <div class="coord-card">
            <div class="coord-icon">🧭</div>
            <div class="coord-details">
              <div class="coord-label">Kinh độ</div>
              <div class="coord-value">{{ getLngDisplay() }}</div>
            </div>
          </div>
          <div class="coord-card full-width" *ngIf="selectedLocation.address">
            <div class="coord-icon">📌</div>
            <div class="coord-details">
              <div class="coord-label">Địa chỉ</div>
              <div class="coord-value">{{ selectedLocation.address }}</div>
            </div>
          </div>
        </div>

        <div class="picker-actions">
          <button type="button" class="btn btn-secondary" (click)="onCancel()">
            <span class="btn-icon">✕</span>
            Hủy
          </button>
          <button 
            type="button" 
            class="btn btn-primary" 
            [disabled]="!selectedLocation"
            (click)="onConfirm()">
            <span class="btn-icon">✓</span>
            Xác nhận vị trí
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .location-picker-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .location-picker {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      max-width: 1000px;
      width: 100%;
      max-height: 90vh;
      background: white;
      border-radius: 1rem;
      padding: 1.75rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow-y: auto;
    }

    .picker-header {
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 1rem;
    }

    .header-content {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .header-icon {
      font-size: 2.5rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .picker-header h4 {
      margin: 0 0 0.5rem 0;
      color: #111827;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .picker-hint {
      margin: 0;
      color: #6b7280;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .search-box {
      display: flex;
      gap: 0.75rem;
      align-items: stretch;
    }

    .search-input-wrapper {
      position: relative;
      flex: 1;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.25rem;
      pointer-events: none;
      opacity: 0.5;
    }

    .search-input {
      width: 100%;
      padding: 0.875rem 1rem 0.875rem 3rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.75rem;
      font-size: 0.95rem;
      transition: all 0.2s;
      background: #f9fafb;
    }

    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      background: white;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .search-btn {
      padding: 0.875rem 2rem;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      border: none;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
    }

    .search-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px -1px rgba(59, 130, 246, 0.4);
    }

    .search-btn:active {
      transform: translateY(0);
    }

    .map-container {
      width: 100%;
      height: 450px;
      border-radius: 1rem;
      border: 3px solid #e5e7eb;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    .coordinates-display {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }

    .coord-card {
      display: flex;
      gap: 1rem;
      padding: 1.25rem;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 0.75rem;
      border: 2px solid #bae6fd;
      transition: all 0.2s;
    }

    .coord-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(56, 189, 248, 0.2);
    }

    .coord-card.full-width {
      grid-column: 1 / -1;
    }

    .coord-icon {
      font-size: 2rem;
      flex-shrink: 0;
      line-height: 1;
    }

    .coord-details {
      flex: 1;
      min-width: 0;
    }

    .coord-label {
      font-size: 0.8rem;
      color: #0369a1;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .coord-value {
      font-size: 1rem;
      color: #0c4a6e;
      font-weight: 500;
      word-break: break-word;
    }

    .picker-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding-top: 0.5rem;
      border-top: 2px solid #f3f4f6;
    }

    .btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1.75rem;
      border: none;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-icon {
      font-size: 1.125rem;
      font-weight: 700;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 2px solid #e5e7eb;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
      border-color: #d1d5db;
    }

    .btn-primary {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: linear-gradient(135deg, #9ca3af, #6b7280);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .location-picker-overlay {
        padding: 0;
      }

      .location-picker {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
        padding: 1rem;
      }

      .picker-header h4 {
        font-size: 1.25rem;
      }

      .header-icon {
        font-size: 2rem;
      }

      .search-box {
        flex-direction: column;
      }

      .map-container {
        height: 350px;
      }

      .coordinates-display {
        grid-template-columns: 1fr;
      }

      .picker-actions {
        flex-direction: column-reverse;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class LocationPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() initialLat?: number;
  @Input() initialLng?: number;
  @Output() locationSelected = new EventEmitter<Location>();
  @Output() cancelled = new EventEmitter<void>();

  selectedLocation: Location | null = null;
  isBrowser = false;
  private map: any;
  private marker: any;
  private L: any; // Leaflet library

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.initialLat && this.initialLng) {
      // Ensure numbers are actually numbers (could be strings from form)
      const lat = typeof this.initialLat === 'string' ? parseFloat(this.initialLat) : this.initialLat;
      const lng = typeof this.initialLng === 'string' ? parseFloat(this.initialLng) : this.initialLng;
      
      if (!isNaN(lat) && !isNaN(lng)) {
        this.selectedLocation = { lat, lng };
      }
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;

    // Wait for next tick to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      // Check if map container exists
      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        console.error('[LocationPicker] Map container not found in DOM');
        alert('Không thể khởi tạo bản đồ. Vui lòng thử lại.');
        return;
      }

      // Dynamically import Leaflet only in browser
      this.L = (await import('leaflet')).default;

      // Ensure lat/lng are numbers
      let lat = 10.8231; // Default: Ho Chi Minh City
      let lng = 106.6297;

      if (this.initialLat && this.initialLng) {
        const parsedLat = typeof this.initialLat === 'number' ? this.initialLat : parseFloat(String(this.initialLat));
        const parsedLng = typeof this.initialLng === 'number' ? this.initialLng : parseFloat(String(this.initialLng));
        
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          lat = parsedLat;
          lng = parsedLng;
        }
      }

      // Initialize map
      this.map = this.L.map('map').setView([lat, lng], this.initialLat ? 15 : 13);

      // Add OpenStreetMap tiles
      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(this.map);

      // Custom red marker icon
      const redIcon = this.L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Add marker
      this.marker = this.L.marker([lat, lng], {
        draggable: true,
        icon: redIcon
      }).addTo(this.map);

      // Update location when marker is dragged
      this.marker.on('dragend', () => {
        const pos = this.marker.getLatLng();
        this.updateLocation(pos.lat, pos.lng);
      });

      // Update location when map is clicked
      this.map.on('click', (e: any) => {
        this.marker.setLatLng(e.latlng);
        this.updateLocation(e.latlng.lat, e.latlng.lng);
      });

      // Set initial location if provided
      if (this.initialLat && this.initialLng) {
        const parsedLat = typeof this.initialLat === 'number' ? this.initialLat : parseFloat(String(this.initialLat));
        const parsedLng = typeof this.initialLng === 'number' ? this.initialLng : parseFloat(String(this.initialLng));
        
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          this.updateLocation(parsedLat, parsedLng);
        }
      }
    } catch (error) {
      console.error('[LocationPicker] Failed to load Leaflet:', error);
      alert('Không thể tải bản đồ. Vui lòng kiểm tra kết nối mạng và thử lại.');
    }
  }

  private updateLocation(lat: number, lng: number): void {
    this.selectedLocation = { lat, lng };
    this.reverseGeocode(lat, lng);
  }

  private async reverseGeocode(lat: number, lng: number): Promise<void> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`
      );
      const data = await response.json();
      if (data && data.display_name) {
        this.selectedLocation = { 
          lat, 
          lng, 
          address: data.display_name 
        };
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }
  }

  async searchAddress(query: string): Promise<void> {
    if (!query.trim()) return;
    if (!this.map) {
      alert('Bản đồ chưa được khởi tạo. Vui lòng đợi một chút.');
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=vi`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        this.map.setView([lat, lng], 16);
        this.marker.setLatLng([lat, lng]);
        this.updateLocation(lat, lng);
      } else {
        alert('Không tìm thấy địa chỉ. Vui lòng thử lại với từ khóa khác.');
      }
    } catch (error) {
      console.error('Address search failed:', error);
      alert('Lỗi khi tìm kiếm địa chỉ. Vui lòng thử lại.');
    }
  }

  onConfirm(): void {
    if (this.selectedLocation) {
      // Ensure we emit proper numbers
      const lat = typeof this.selectedLocation.lat === 'number' 
        ? this.selectedLocation.lat 
        : parseFloat(String(this.selectedLocation.lat));
      const lng = typeof this.selectedLocation.lng === 'number'
        ? this.selectedLocation.lng
        : parseFloat(String(this.selectedLocation.lng));
      
      this.locationSelected.emit({
        lat,
        lng,
        address: this.selectedLocation.address
      });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  getLatDisplay(): string {
    if (!this.selectedLocation) return 'N/A';
    const lat = typeof this.selectedLocation.lat === 'number' 
      ? this.selectedLocation.lat 
      : parseFloat(String(this.selectedLocation.lat));
    return isNaN(lat) ? 'N/A' : lat.toFixed(6);
  }

  getLngDisplay(): string {
    if (!this.selectedLocation) return 'N/A';
    const lng = typeof this.selectedLocation.lng === 'number'
      ? this.selectedLocation.lng
      : parseFloat(String(this.selectedLocation.lng));
    return isNaN(lng) ? 'N/A' : lng.toFixed(6);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}
