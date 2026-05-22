import { Component, OnInit } from '@angular/core';
import { AuthService } from '@services/auth.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { OrderService, PurchasedOrder } from '@services/order.service';
import { Product, ProductService } from '@services/product.service';
import { WhatsAppNotificationService } from '@services/whatsapp-notification.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-seller',
  templateUrl: './seller.component.html',
  styleUrls: ['./seller.component.scss'],
  standalone: false,
})
export class SellerComponent implements OnInit {
  products: Product[] = [];
  orders: PurchasedOrder[] = [];
  archivedOrders: PurchasedOrder[] = [];
  cancellationReasons: Record<string, string> = {};
  message = '';
  private readonly productApprovalMessage =
    'Admin will approve the Product. It will take 24 hrs, you have to wait till then.';
  product: Partial<Product> = {
    name: '',
    description: '',
    price: 0,
    category: '',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    stock: 1,
  };

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private confirmDialogService: ConfirmDialogService,
    private whatsappService: WhatsAppNotificationService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadOrders();
  }

  loadProducts(): void {
    const sellerId = this.authService.getCurrentUser()?.id;
    if (!sellerId) {
      this.products = [];
      return;
    }

    this.productService.getProducts({ sellerId, includeOutOfStock: true }).subscribe((response) => {
      this.products = response.data.filter((product) => product.sellerId === sellerId);
    });
  }

  loadOrders(): void {
    const sellerId = this.authService.getCurrentUser()?.id;
    if (!sellerId) {
      this.orders = [];
      this.archivedOrders = [];
      return;
    }

    this.orderService.getSellerOrders(sellerId, true).subscribe((response) => {
      const sellerOrders = response.data.filter((order) => order.items.some((item) => item.sellerId === sellerId));
      this.orders = sellerOrders.filter((order) => order.status !== 'archived');
      this.archivedOrders = sellerOrders.filter((order) => order.status === 'archived');
    });
  }

  addProduct(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (!this.product.stock || this.product.stock < 1) {
      this.message = 'Available product count must be at least 1.';
      return;
    }

    this.confirmDialogService.openConfirmDialog({
      title: 'Add product',
      message: 'Are you sure to Add ?',
      confirmText: 'Add',
      type: 'add',
    });

    this.confirmDialogService.result$.pipe(take(1)).subscribe((result) => {
      if (!result.confirmed) return;
      const request: Partial<Product> = {
        ...this.product,
        sellerId: user.id,
        sellerName: user.name,
        rating: 0,
        reviews: 0,
        status: 'pending',
      };
      this.productService.addProduct(request).subscribe({
        next: (response) => {
          this.message = this.productApprovalMessage;
          this.whatsappService
            .notifyAdminProductAdded(response.data.id, response.data.name, user.name)
            .subscribe((notificationResponse) => {
              this.message = `${this.message} ${notificationResponse.message}`;
            });
          this.loadProducts();
        },
        error: () => {
          const productName = request.name || 'New product';
          this.whatsappService
            .notifyAdminProductAdded(`local-product-${Date.now()}`, productName, user.name)
            .subscribe((notificationResponse) => {
              this.message = `${this.productApprovalMessage} ${notificationResponse.message}`;
            });
        },
      });
    });
  }

  rejectOrder(order: PurchasedOrder): void {
    const reason = this.cancellationReasons[order.id]?.trim();
    if (!reason) {
      this.message = 'Please enter cancellation reason before rejecting the order.';
      return;
    }

    this.orderService.rejectOrder(order.id, reason).subscribe((response) => {
      this.message = `${response.message} User notification: ${response.data.notification}`;
      response.data.items.forEach((item) => this.productService.incrementStock(item.productId, item.quantity));
      this.loadProducts();
      this.loadOrders();
    });
  }

  archiveDelivered(order: PurchasedOrder): void {
    this.orderService.archiveDeliveredOrder(order.id).subscribe((response) => {
      this.message = response.message;
      this.loadOrders();
    });
  }

  removeRefunded(order: PurchasedOrder): void {
    this.orderService.archiveRefundedOrder(order.id).subscribe((response) => {
      this.message = response.message;
      this.loadOrders();
    });
  }
}
