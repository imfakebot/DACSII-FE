import { Component, OnInit } from "@angular/core";
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FieldsService, Field } from '../services/fields.service';
 
@Component({
  selector: "app-body",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./body.html",
  styleUrls: ["./body.scss"]
})
export class BodyComponent implements OnInit {
  fields: Field[] = [];

  constructor(private fieldsService: FieldsService) {}

  async ngOnInit() {
    // Lấy dữ liệu sân từ service (gọi backend /api/fields qua proxy)
    this.fields = await this.fieldsService.getFields();
  }
  
  // 4 sân đầu làm 'Sân tập gần bạn'
  get nearFields(){
    return this.fields ? this.fields.slice(0,4) : [];
  }

  // Top fields theo đánh giá trung bình (avgRating) — nếu không có rating, coi là 0
  get topFields(){
    if(!this.fields || this.fields.length===0) return [];
    return [...this.fields]
      .sort((a,b) => (Number(b.avgRating||0) - Number(a.avgRating||0)))
      .slice(0,4);
  }

  // Đề xuất: ưu tiên cùng thành phố với sân đầu tiên, nếu không có thì random
  get recommendedFields(){
    if(!this.fields || this.fields.length===0) return [];
    const city = this.fields[0]?.city;
    let list: any[] = [];
    if(city){
      list = this.fields.filter(f => f.city === city && !this.nearFields.some(n => n.id === f.id)).slice(0,4);
    }
    if(list.length > 0) return list;
    // fallback: random selection excluding near and top
    const excluded = new Set([...this.nearFields.map(f=>f.id), ...this.topFields.map(f=>f.id)]);
    const pool = this.fields.filter(f => !excluded.has(f.id));
    for(let i = pool.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0,4);
  }
}
