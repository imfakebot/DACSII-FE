import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldsService, Field } from '../services/fields.service';

/*
  FieldsListComponent (Tiếng Việt):
  - Hiển thị danh sách các sân dưới dạng lưới các card
  - Dùng class chung `.grid`, `.card` được định nghĩa trong `app.scss`
*/
@Component({
  selector: 'fields-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, RouterModule],
  templateUrl: './fields-list.html',
  styleUrls: ['./fields-list.scss']
})
export class FieldsListComponent implements OnInit {
  // Dữ liệu sân
  fields: Field[] = [];
  // Trường dùng cho tìm kiếm và lọc (client-side)
  query = '';
  selectedType: string | null = null;
  selectedCity: string | null = null;

  constructor(private router: Router, private route: ActivatedRoute, private fieldsService: FieldsService) {}

  async ngOnInit(){
    this.fields = await this.fieldsService.getFields();
    // Nếu có query param 'type' (ví dụ click từ header), tự động set filter
    const typeParam = this.route.snapshot.queryParamMap.get('type');
    if(typeParam){
      this.selectedType = typeParam;
    }
  }

  // Lấy danh sách kiểu sân hiện có từ dữ liệu (unique)
  get types(){
    return Array.from(new Set(this.fields.map(f => f.type))).sort();
  }

  // Lấy danh sách thành phố hiện có
  get cities(){
    return Array.from(new Set(this.fields.map(f => f.city))).sort();
  }

  // Danh sách sân sau khi áp filter/search
  get displayedFields(){
    return this.fields.filter(f => {
      const matchesQuery = !this.query || (f.name + ' ' + (f.description||'')).toLowerCase().includes(this.query.toLowerCase());
      const matchesType = !this.selectedType || f.type === this.selectedType;
      const matchesCity = !this.selectedCity || f.city === this.selectedCity;
      return matchesQuery && matchesType && matchesCity;
    });
  }

  viewDetail(id: any){ this.router.navigate(['/detail', id]); }
  bookNow(id: any){ this.router.navigate(['/booking'], { queryParams: { fieldId: id } }); }

  // Xử lý nút tìm ở hero (hiện chỉ focus vào search)
  onHeroSearch(){
    // hiện tại không cần làm gì thêm; giữ để template không lỗi
    // tương lai có thể trigger tìm nâng cao hoặc chuyển focus
    return;
  }
}