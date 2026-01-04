import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { WebSocketService } from '../services/websocket.service';
import { Subscription } from 'rxjs';


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
export class HeaderComponent implements OnInit, OnDestroy {
  authReady = false;
  isRegister = false;
  userName: string | null = null;
  isAdmin = false;
  showAdminDropdown = false;
  // state for user dropdown (used by template)
  showUserDropdown = false;
  // mobile menu state
  showMobileMenu = false;
  // notification badge
  unreadCount = 0;
  
  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private authState: AuthStateService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private wsService: WebSocketService
  ) {
    // wait for auth initialization to avoid flicker of guest UI during SSR/client bootstrap
    this.subs.push(this.authState.ready$.subscribe(r => {
      this.authReady = !!r;
    }));

    this.subs.push(this.authState.user$.subscribe(u => {
      this.userName = u?.full_name || null;
      try {
        this.isAdmin = this.authState.isAdmin();
      } catch {
        this.isAdmin = false;
      }

      // Kết nối WebSocket khi user đăng nhập
      if (this.userName) {
        this.wsService.connect();
        this.loadUnreadCount();
      } else {
        this.wsService.disconnect();
        this.unreadCount = 0;
      }
    }));

    // Lắng nghe thông báo real-time để cập nhật badge
    this.subs.push(
      this.notificationService.getUnreadCount$().subscribe(count => {
        this.unreadCount = count;
      })
    );
  }

  ngOnInit(): void {
    // Load initial unread count if user is logged in
    if (this.userName) {
      this.loadUnreadCount();
    }
  }

  async loadUnreadCount(): Promise<void> {
    try {
      this.unreadCount = await this.notificationService.getUnreadCount();
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }

  onLogin(e?: Event){
    if(e) e.preventDefault();
    this.isRegister = false;
    // navigate to login page
    this.router.navigate(['/Login/login']);
  }

  onRegister(e?: Event){
    if(e) e.preventDefault();
    this.isRegister = true;
    // navigate to register page (placeholder)
    this.router.navigate(['/Register/register']);
  }

  async onLogout(e?: Event){
    if(e) e.preventDefault();
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    this.router.navigate(['/Login/login']);
  }

  toggleAdminDropdown() {
    this.showAdminDropdown = !this.showAdminDropdown;
  }

  closeAdminDropdown() {
    this.showAdminDropdown = false;
  }

  toggleUserDropdown() {
    this.showUserDropdown = !this.showUserDropdown;
  }

  closeUserDropdown() {
    this.showUserDropdown = false;
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
  }

  ngOnDestroy(){
    this.subs.forEach(s => s.unsubscribe());
  }


}
