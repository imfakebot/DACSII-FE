import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/*
  Footer component (Tiếng Việt):
  - Hiển thị thông tin bản quyền
  - Styling sử dụng class `.site-footer` trong `app.scss`
*/
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss']
})
export class FooterComponent {
  hotline: string = '📞 0765539316';
  email: string = '✉ linhtvt.24it@vku.udn.vn';  
  email1: string = '✉ anhtt.24it@vku.udn.vn';  
  dress: string = 'Thành phố Đà Nẵng 🏠';
}
