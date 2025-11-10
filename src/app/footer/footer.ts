import { Component } from '@angular/core';

/*
  Footer component (Tiếng Việt):
  - Hiển thị thông tin bản quyền
  - Styling sử dụng class `.site-footer` trong `app.scss`
*/
@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss']
})
export class FooterComponent {
  hotline: string = '📞 0765539316';
  email: string = '✉ linhtvt24it@vku.udn.vn';
  dress: string = 'Thành phố Đà Nẵng 🏠';
}
