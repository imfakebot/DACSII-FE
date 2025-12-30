import { Component, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './header/header';
import { FooterComponent } from './footer/footer';
import { BodyComponent } from './body/body';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

// Component gốc của ứng dụng
// - Hiển thị header, router outlet và footer
@Component({
  selector: 'app-root',
  imports: [ HeaderComponent, FooterComponent, RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Tiêu đề (signal) dùng trong template nếu cần
  protected readonly title = signal('DACSII - Đặt sân');
  protected showLayout = signal(true);

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Only run in browser
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: any) => {
        // Ẩn header/footer khi ở trang 404
        this.showLayout.set(!event.url.includes('/404'));
      });
    }
  }
}
