import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent implements OnInit {
  email = 'user1@shophub.test';
  password = 'User@123';
  selectedRole: 'user' | 'seller' | 'admin' = 'user';
  errorMessage = '';
  infoMessage = 'Demo users: user1@shophub.test/User@123, seller1@shophub.test/Seller@123, admin@shophub.test/Admin@123';
  loading = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    const user = this.authService.getCurrentUser();
    this.router.navigate([user?.role === 'seller' ? '/seller' : user?.role === 'admin' ? '/admin' : '/products']);
  }

  selectRole(role: 'user' | 'seller' | 'admin'): void {
    this.selectedRole = role;
    if (role === 'admin') {
      this.email = 'admin@shophub.test';
      this.password = 'Admin@123';
      return;
    }

    this.email = role === 'user' ? 'user1@shophub.test' : 'seller1@shophub.test';
    this.password = role === 'user' ? 'User@123' : 'Seller@123';
  }

  login(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.loading = false;
        const user = response.data.user;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }
        this.router.navigate([user.role === 'seller' ? '/seller' : user.role === 'admin' ? '/admin' : '/products']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Login failed. Check credentials or backend API status.';
      },
    });
  }
}
