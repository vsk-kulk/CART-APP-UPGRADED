import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CartService } from '@services/cart.service';
import { AuthService } from '@services/auth.service';
import { OrderService, PurchasedOrder } from '@services/order.service';
import { PaymentConfirmation, PaymentService } from '@services/payment.service';
import { Product, ProductService } from '@services/product.service';

@Component({
  selector: 'app-payment-confirmation',
  templateUrl: './payment-confirmation.component.html',
  styleUrls: ['./payment-confirmation.component.scss'],
  standalone: false,
})
export class PaymentConfirmationComponent implements OnInit {
  status: 'success' | 'failed' | 'pending' = 'pending';
  message = 'Checking payment status...';
  confirmation?: PaymentConfirmation['data'];
  order?: PurchasedOrder;
  private readonly completedPurchasesKey = 'completedPurchases';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private paymentService: PaymentService,
    private cartService: CartService,
    private productService: ProductService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status === 'success' || status === 'failed') {
      this.status = status;
      this.message = status === 'success' ? 'Payment Confirmation' : 'Payment Failed';
      if (status === 'success') {
        this.completePurchase({
          paymentId: this.route.snapshot.queryParamMap.get('session_id') || 'success-return',
          transactionId: this.route.snapshot.queryParamMap.get('session_id') || `txn-${Date.now()}`,
          amount: 0,
        });
      }
      return;
    }

    if (!sessionId) {
      this.status = 'failed';
      this.message = 'Payment Failed';
      return;
    }

    this.paymentService.confirmPayment(sessionId).subscribe({
      next: (response) => {
        this.status = response.data.status;
        this.message = response.data.status === 'success' ? 'Payment Confirmation' : 'Payment Failed';
        this.confirmation = response.data;
        if (response.data.status === 'success') {
          this.completePurchase({
            paymentId: response.data.paymentId || sessionId,
            transactionId: response.data.transactionId,
            amount: response.data.amount,
          });
        }
      },
      error: () => {
        this.status = 'failed';
        this.message = 'Payment Failed';
      },
    });
  }

  downloadInvoice(): void {
    if (this.order) {
      this.orderService.downloadInvoice(this.order);
    }
  }

  private completePurchase(payment: { paymentId: string; transactionId: string; amount: number }): void {
    if (this.wasPurchaseProcessed(payment.paymentId)) {
      this.order = this.orderService.getStoredOrder(payment.paymentId);
      return;
    }

    const user = this.authService.getCurrentUser();
    const items = this.cartService.getCurrentCart();
    if (!user || items.length === 0) {
      return;
    }

    this.productService.getProducts({ includeOutOfStock: true }).subscribe((response) => {
      const products: Product[] = response.data;
      this.orderService
        .createOrderFromCart({
          user,
          items,
          products,
          paymentId: payment.paymentId,
          transactionId: payment.transactionId,
          amount: payment.amount,
        })
        .subscribe((orderResponse) => {
          this.order = orderResponse.data;
          this.productService.decrementPurchasedStock(items);
          this.cartService.clearCart().subscribe();
          this.markPurchaseProcessed(payment.paymentId);
        });
    });
  }

  private wasPurchaseProcessed(purchaseId: string): boolean {
    return this.getCompletedPurchases().includes(purchaseId);
  }

  private markPurchaseProcessed(purchaseId: string): void {
    const purchases = [...this.getCompletedPurchases(), purchaseId];
    localStorage.setItem(this.completedPurchasesKey, JSON.stringify([...new Set(purchases)]));
  }

  private getCompletedPurchases(): string[] {
    const savedPurchases = localStorage.getItem(this.completedPurchasesKey);
    if (!savedPurchases) {
      return [];
    }

    try {
      return JSON.parse(savedPurchases) as string[];
    } catch {
      return [];
    }
  }
}
