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
  isRegister = false;
  userName: string | null = null;
  private sub?: Subscription;

  constructor(private router: Router, private authState: AuthStateService) {
    this.sub = this.authState.user$.subscribe(u => {
      this.userName = u ? (u.full_name || u.email) : null;
    });
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

  ngOnDestroy(){
    this.sub?.unsubscribe();
  }
}
