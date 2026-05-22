import { Component, OnInit } from '@angular/core';
import { AuthService } from '@services/auth.service';
import { CartService } from '@services/cart.service';
import { PaymentService } from '@services/payment.service';
import { ProductService } from '@services/product.service';
import { Product } from '@services/product.service';
import { CartItem } from '@services/cart.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
  standalone: false,
})
export class PaymentComponent implements OnInit {
  amount = 0;
  message = '';
  loading = false;
  private products: Product[] = [];
  private cartItems: CartItem[] = [];

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private productService: ProductService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.productService.getProducts({ includeOutOfStock: true }).subscribe((productsResponse) => {
      this.products = productsResponse.data;
      this.cartService.getCart().subscribe((cartResponse) => {
        this.cartItems = cartResponse.data.items;
        this.amount = this.cartItems.reduce((total, item) => {
          const product = this.products.find((productItem) => productItem.id === item.productId);
          return total + (product?.price || 0) * item.quantity;
        }, 0);
      });
    });
  }

  continuePayment(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const unavailableItem = this.cartItems.find((item) => {
      const product = this.products.find((productItem) => productItem.id === item.productId);
      return !product || product.stock < item.quantity;
    });
    if (unavailableItem) {
      const product = this.products.find((productItem) => productItem.id === unavailableItem.productId);
      this.message = `${product?.name || 'A product'} has only ${product?.stock || 0} available. Please update your cart before payment.`;
      return;
    }

    this.loading = true;
    this.message = '';
    this.paymentService
      .initiatePayment({
        cartId: 'active-cart',
        amount: this.amount,
        currency: 'USD',
        email: user.email,
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.statusCode === 200 || response.statusCode === 201) {
            window.location.href = response.data.paymentUrl;
          } else {
            this.message = response.message;
          }
        },
        error: () => {
          this.loading = false;
          this.message = 'Payment API did not return a Stripe page URL.';
        },
      });
  }
}
