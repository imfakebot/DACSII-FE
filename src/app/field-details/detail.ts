import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { getFieldById } from '../services/fields.service';

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
  field: any = null;
  constructor(private route: ActivatedRoute, private router: Router) {}
  async ngOnInit(){
    const id = this.route.snapshot.paramMap.get('id');
    this.field = await getFieldById(Number(id));
  }
  goBack(){ this.router.navigate(['/']); }
  book(id: any){ this.router.navigate(['/booking'], { queryParams: { fieldId: id } }); }
}
