import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FieldsService, Field } from '../services/fields.service';

/*
  DetailComponent (Tiếng Việt):
  - Hiển thị thông tin chi tiết một sân
  - Dùng layout `.container` và `.actions` đã có trong `app.scss`
*/
@Component({
  selector: 'field-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail.html',
  styleUrls: ['./detail.scss']
})
export class DetailComponent implements OnInit {
  field: Field | null = null;
  constructor(private route: ActivatedRoute, private router: Router, private fieldsService: FieldsService) {}
  async ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id');
    if(!id) return;
    this.field = await this.fieldsService.getFieldById(id);
  }
  goBack(){ this.router.navigate(['/fields']); }
  book(id: string){ this.router.navigate(['/booking'], { queryParams: { fieldId: id } }); }
}
