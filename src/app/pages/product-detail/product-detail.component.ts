import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { AuthService } from '@services/auth.service';
import { CartService } from '@services/cart.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { Product, ProductService } from '@services/product.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  standalone: false,
})
export class ProductDetailComponent implements OnInit {
  product?: Product;
  isLoading = true;
  message = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private confirmDialogService: ConfirmDialogService
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');

    if (!productId) {
      this.isLoading = false;
      this.message = 'Product not found.';
      return;
    }

    this.productService.getProduct(productId).subscribe({
      next: (response) => {
        this.product = response.data;
        if (this.product.stock <= 0) {
          this.message = 'This product is out of stock.';
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.message = 'Unable to load product details.';
      },
    });
  }

  addToCart(): void {
    if (!this.product) {
      return;
    }

    if (this.product.stock <= 0) {
      this.message = 'This product is out of stock.';
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/products/${this.product.id}` } });
      return;
    }

    this.confirmDialogService.openConfirmDialog({
      title: 'Add product',
      message: 'Are you sure to Add ?',
      confirmText: 'Add',
      cancelText: 'Cancel',
      type: 'add',
    });

    this.confirmDialogService.result$.pipe(take(1)).subscribe((result) => {
      if (!result.confirmed || !this.product) {
        return;
      }

      this.cartService.addToCart(this.product.id, 1).subscribe({
        next: (response) => {
          this.message = response.message || `${this.product?.name} added to cart.`;
        },
        error: () => {
          this.message = 'Unable to add product. Please try again.';
        },
      });
    });
  }
}
