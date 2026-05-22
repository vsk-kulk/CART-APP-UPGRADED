import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '@services/auth.service';
import { CartService, CartItem } from '@services/cart.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: false,
})
export class NavbarComponent implements OnInit {
  currentUser: User | null = null;
  cartItems: CartItem[] = [];
  cartItems$: Observable<CartItem[]>;
  menuOpen = false;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router
  ) {
    this.cartItems$ = this.cartService.cart$;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    this.cartService.cart$.subscribe((items) => {
      this.cartItems = items;
    });

    if (this.authService.isAuthenticated()) {
      this.cartService.getCart().subscribe();
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
      this.closeMenu();
    });
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin' || false;
  }

  get isSeller(): boolean {
    return this.currentUser?.role === 'seller' || false;
  }

  get cartCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }
}
