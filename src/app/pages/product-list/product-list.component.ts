import { Component, OnInit } from '@angular/core';
import { ProductService, Product } from '@services/product.service';
import { CartService } from '@services/cart.service';
import { AuthService } from '@services/auth.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  standalone: false,
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: string[] = [];
  sellers: Array<{ id: string; name: string }> = [];
  selectedCategory = '';
  sortBy = '';
  searchQuery = '';
  selectedSellerId = '';
  minPrice?: number;
  maxPrice?: number;
  statusMessage = '';

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private confirmDialogService: ConfirmDialogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadSellers();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe((response) => {
      if (response.statusCode === 200) {
        this.products = response.data;
        this.filterProducts();
        this.categories = [...new Set(this.products.map((p) => p.category))];
      }
    });
  }

  loadSellers(): void {
    this.productService.getSellers().subscribe((response) => {
      if (response.statusCode === 200) {
        this.sellers = response.data;
      }
    });
  }

  filterProducts(): void {
    let result = [...this.products];

    if (this.selectedCategory) {
      result = result.filter((p) => p.category === this.selectedCategory);
    }

    if (this.selectedSellerId) {
      result = result.filter((p) => p.sellerId === this.selectedSellerId);
    }

    if (this.minPrice !== undefined && this.minPrice !== null) {
      result = result.filter((p) => p.price >= Number(this.minPrice));
    }

    if (this.maxPrice !== undefined && this.maxPrice !== null) {
      result = result.filter((p) => p.price <= Number(this.maxPrice));
    }

    if (this.searchQuery) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    if (this.sortBy) {
      switch (this.sortBy) {
        case 'price-low':
          result.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          result.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          result.sort((a, b) => b.rating - a.rating);
          break;
        case 'newest':
          result.sort(
            (a, b) =>
              new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime()
          );
          break;
      }
    }

    this.filteredProducts = result;
  }

  addToCart(product: Product): void {
    if (product.stock <= 0) {
      this.statusMessage = `${product.name} is out of stock.`;
      this.products = this.products.filter((item) => item.id !== product.id);
      this.filterProducts();
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
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
      if (!result.confirmed) {
        return;
      }

      this.cartService.addToCart(product.id, 1).subscribe({
        next: (response) => {
          this.statusMessage = response.message || `${product.name} added to cart.`;
        },
        error: (error) => {
          this.statusMessage = 'Unable to add product. Please try again.';
          console.error('Error adding product to cart:', error);
        },
      });
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.filterProducts();
  }
}
