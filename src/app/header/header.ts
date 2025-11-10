import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';


/*
  Header component (Tiếng Việt):
  - Hiển thị tiêu đề và điều hướng chính của ứng dụng
  - Dùng các class chung để styling (xem `app.scss`)
*/
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent {}
