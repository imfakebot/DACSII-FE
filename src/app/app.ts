import { Component, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, NavigationStart, ActivatedRoute } from '@angular/router';
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
      // Lắng nghe cả NavigationStart để bắt redirect sớm hơn
      this.router.events.subscribe(event => {
        if (event instanceof NavigationStart || event instanceof NavigationEnd) {
          // Đợi một chút để đảm bảo router đã xử lý xong
          setTimeout(() => {
            this.checkLayoutVisibility(this.router.url);
          }, 0);
        }
      });
      
      // Kiểm tra ngay lần đầu
      setTimeout(() => {
        this.checkLayoutVisibility(this.router.url);
      }, 0);
    }
  }

  onRouterOutletActivate(component: any): void {
    // Kiểm tra nếu component được activate là NotFoundComponent
    if (component.constructor.name === 'NotFoundComponent') {
      this.showLayout.set(false);
    } else {
      this.showLayout.set(true);
    }
  }

  private checkLayoutVisibility(url: string): void {
    // Ẩn header/footer khi ở trang 404
    const is404 = url.includes('/404');
    this.showLayout.set(!is404);
  }
}
