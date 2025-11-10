import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header';
import { FooterComponent } from './footer/footer';
import { BodyComponent } from './body/body';

// Component gốc của ứng dụng
// - Hiển thị header, router outlet và footer
@Component({
  selector: 'app-root',
  imports: [ HeaderComponent, FooterComponent, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Tiêu đề (signal) dùng trong template nếu cần
  protected readonly title = signal('DACSII - Đặt sân');
}
