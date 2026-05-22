import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartItem, CartService } from '@services/cart.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { AuthService } from '@services/auth.service';
import { OrderService, PurchasedOrder } from '@services/order.service';
import { Product, ProductService } from '@services/product.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  standalone: false,
})
export class CartComponent implements OnInit {
  items: CartItem[] = [];
  products: Product[] = [];
  purchaseOrders: PurchasedOrder[] = [];
  archivedPurchaseOrders: PurchasedOrder[] = [];
  message = '';

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private productService: ProductService,
    private orderService: OrderService,
    private confirmDialogService: ConfirmDialogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productService.getProducts().subscribe((response) => (this.products = response.data));
    this.cartService.getCart().subscribe((response) => (this.items = response.data.items));
    this.cartService.cart$.subscribe((items) => (this.items = items));
    this.loadPurchaseOrders();
  }

  getProduct(productId: string): Product | undefined {
    return this.products.find((product) => product.id === productId);
  }

  getTotal(): number {
    return this.items.reduce((total, item) => {
      const product = this.getProduct(item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  }

  changeQuantity(item: CartItem, quantity: number): void {
    this.confirmDialogService.openConfirmDialog({
      title: 'Change product',
      message: 'Do you want to change this cart product quantity?',
      confirmText: 'Change',
      type: 'edit',
    });
    this.confirmDialogService.result$.pipe(take(1)).subscribe((result) => {
      if (!result.confirmed) return;
      this.cartService.updateQuantity(item.productId, quantity).subscribe((response) => {
        this.items = response.data.items;
        this.message = response.message;
      });
    });
  }

  remove(item: CartItem): void {
    this.confirmDialogService.openConfirmDialog({
      title: 'Remove product',
      message: 'Are you sure to Remove ?',
      confirmText: 'Remove',
      type: 'remove',
    });
    this.confirmDialogService.result$.pipe(take(1)).subscribe((result) => {
      if (!result.confirmed) return;
      this.cartService.removeFromCart(item.productId).subscribe((response) => {
        this.items = response.data.items;
        this.message = response.message;
      });
    });
  }

  saveCart(): void {
    this.cartService.saveCart().subscribe((response) => (this.message = response.message));
  }

  addFavorite(item: CartItem): void {
    this.cartService.addToFavorites(item.productId).subscribe({
      next: () => (this.message = 'Favorite saved.'),
      error: () => (this.message = 'Favorite request queued for backend.'),
    });
  }

  continuePayment(): void {
    this.router.navigate(['/payment']);
  }

  loadPurchaseOrders(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.purchaseOrders = [];
      this.archivedPurchaseOrders = [];
      return;
    }

    this.orderService.getUserOrders(user.id, true).subscribe((response) => {
      this.purchaseOrders = response.data.filter((order) => order.status !== 'archived');
      this.archivedPurchaseOrders = response.data.filter((order) => order.status === 'archived');
    });
  }

  archiveReceivedOrder(order: PurchasedOrder): void {
    this.orderService.archiveUserOrder(order.id).subscribe((response) => {
      this.message = response.message;
      this.loadPurchaseOrders();
    });
  }

  downloadInvoice(order: PurchasedOrder): void {
    this.orderService.downloadInvoice(order);
  }
}
