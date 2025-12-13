import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
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
export class HeaderComponent implements OnDestroy {
  authReady = false;
  isRegister = false;
  userName: string | null = null;
  isAdmin = false;
  showAdminDropdown = false;
  // state for user dropdown (used by template)
  showUserDropdown = false;
  
  private subs: Subscription[] = [];

  constructor(private router: Router, private authState: AuthStateService) {
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
    }));
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

  onLogout(e?: Event){
    if(e) e.preventDefault();
    this.authState.setUser(null);
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

  ngOnDestroy(){
    this.subs.forEach(s => s.unsubscribe());
  }


}
