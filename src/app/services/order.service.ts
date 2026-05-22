import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { CartItem } from './cart.service';
import { Product } from './product.service';
import { User } from './auth.service';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BillDetails {
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

export interface CourierDetails {
  serviceName: string;
  trackingId: string;
  homePageUrl: string;
}

export interface PurchasedOrder {
  id: string;
  paymentId: string;
  transactionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userMobile: string;
  userAddress: string;
  items: OrderItem[];
  bill: BillDetails;
  courier: CourierDetails;
  status: 'paid' | 'cancelled' | 'refund_pending' | 'refund_completed' | 'delivered' | 'archived';
  cancellationReason?: string;
  notification?: string;
  purchasedAt: string;
  archivedAt?: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = 'http://localhost:8080/api/orders';
  private readonly ordersKey = 'purchasedOrders';

  constructor(private http: HttpClient) {}

  createOrderFromCart(params: {
    user: User;
    items: CartItem[];
    products: Product[];
    paymentId: string;
    transactionId: string;
    amount: number;
  }): Observable<ApiResponse<PurchasedOrder>> {
    const order = this.buildOrder(params);
    return this.http.post<ApiResponse<PurchasedOrder>>(this.apiUrl, order).pipe(
      tap((response) => this.upsertOrder(response.data)),
      catchError(() => {
        this.upsertOrder(order);
        return of(this.createResponse(order, 'Order stored locally until backend archive/order API is available.', 201));
      })
    );
  }

  getUserOrders(userId: string, includeArchived = false): Observable<ApiResponse<PurchasedOrder[]>> {
    return this.http.get<ApiResponse<PurchasedOrder[]>>(`${this.apiUrl}/user/${userId}`).pipe(
      catchError(() =>
        of(this.createResponse(this.getStoredOrders().filter((order) => order.userId === userId && (includeArchived || order.status !== 'archived')), 'User purchase orders loaded locally.'))
      )
    );
  }

  getSellerOrders(sellerId: string, includeArchived = false): Observable<ApiResponse<PurchasedOrder[]>> {
    return this.http.get<ApiResponse<PurchasedOrder[]>>(`${this.apiUrl}/seller/${sellerId}`).pipe(
      catchError(() =>
        of(this.createResponse(this.getStoredOrders().filter((order) => order.items.some((item) => item.sellerId === sellerId) && (includeArchived || order.status !== 'archived')), 'Seller purchase orders loaded locally.'))
      )
    );
  }

  rejectOrder(orderId: string, reason: string): Observable<ApiResponse<PurchasedOrder>> {
    return this.http.post<ApiResponse<PurchasedOrder>>(`${this.apiUrl}/${orderId}/reject`, { reason }).pipe(
      tap((response) => this.upsertOrder(response.data)),
      catchError(() => {
        const order = this.getStoredOrders().find((item) => item.id === orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        const updatedOrder: PurchasedOrder = {
          ...order,
          status: 'refund_completed',
          cancellationReason: reason,
          notification: `Product Seller has cancelled your request. Reason: ${reason}. Amount refund completed.`,
        };
        this.upsertOrder(updatedOrder);
        return of(this.createResponse(updatedOrder, 'Order rejected locally. Stripe refund request simulated as completed.'));
      })
    );
  }

  archiveDeliveredOrder(orderId: string): Observable<ApiResponse<PurchasedOrder>> {
    return this.archiveOrder(orderId, 'Delivered order moved to archive records.');
  }

  archiveRefundedOrder(orderId: string): Observable<ApiResponse<PurchasedOrder>> {
    return this.archiveOrder(orderId, 'Rejected and refunded order moved to archive records.');
  }

  archiveUserOrder(orderId: string): Observable<ApiResponse<PurchasedOrder>> {
    return this.archiveOrder(orderId, 'Purchase moved to user archive records.');
  }

  getStoredOrder(orderId: string): PurchasedOrder | undefined {
    return this.getStoredOrders().find((order) => order.id === orderId || order.paymentId === orderId);
  }

  downloadInvoice(order: PurchasedOrder): void {
    const lines = [
      'ShopHub Invoice',
      `Invoice ID: ${order.id}`,
      `Date/Time: ${new Date(order.purchasedAt).toLocaleString()}`,
      `Customer: ${order.userName}`,
      `Mobile: ${order.userMobile}`,
      `Address: ${order.userAddress}`,
      '',
      'Products:',
      ...order.items.map((item) => `${item.productName} x ${item.quantity} @ $${item.unitPrice} = $${item.lineTotal}`),
      '',
      `Subtotal: $${order.bill.subtotal.toFixed(2)}`,
      `Discount: $${order.bill.discount.toFixed(2)}`,
      `Tax: $${order.bill.taxAmount.toFixed(2)}`,
      `Total: $${order.bill.totalAmount.toFixed(2)}`,
      '',
      `Payment ID: ${order.paymentId}`,
      `Transaction ID: ${order.transactionId}`,
      `Courier: ${order.courier.serviceName}`,
      `Tracking ID: ${order.courier.trackingId}`,
      `Courier Link: ${order.courier.homePageUrl}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${order.id}-invoice.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private archiveOrder(orderId: string, message: string): Observable<ApiResponse<PurchasedOrder>> {
    return this.http.post<ApiResponse<PurchasedOrder>>(`${this.apiUrl}/${orderId}/archive`, {}).pipe(
      tap((response) => this.upsertOrder(response.data)),
      catchError(() => {
        const order = this.getStoredOrders().find((item) => item.id === orderId);
        if (!order) {
          throw new Error('Order not found');
        }
        const updatedOrder: PurchasedOrder = {
          ...order,
          status: 'archived',
          archivedAt: new Date().toISOString(),
        };
        this.upsertOrder(updatedOrder);
        return of(this.createResponse(updatedOrder, message));
      })
    );
  }

  private buildOrder(params: {
    user: User;
    items: CartItem[];
    products: Product[];
    paymentId: string;
    transactionId: string;
    amount: number;
  }): PurchasedOrder {
    const subtotal = params.items.reduce((total, item) => {
      const product = params.products.find((productItem) => productItem.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
    const discount = subtotal >= 5000 ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
    const taxAmount = Math.round((subtotal - discount) * 0.18 * 100) / 100;
    const totalAmount = Math.round((subtotal - discount + taxAmount) * 100) / 100;
    const orderId = `order-${Date.now()}`;

    return {
      id: orderId,
      paymentId: params.paymentId,
      transactionId: params.transactionId,
      userId: params.user.id,
      userName: params.user.name,
      userEmail: params.user.email,
      userMobile: params.user.whatsappNumber || 'Not provided',
      userAddress: this.formatAddress(params.user),
      items: params.items.map((item) => {
        const product = params.products.find((productItem) => productItem.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || item.productId,
          productImage: product?.image || '',
          sellerId: product?.sellerId || 'seller',
          sellerName: product?.sellerName || 'Product Seller',
          sellerPhone: '+919900001101',
          quantity: item.quantity,
          unitPrice: product?.price || 0,
          lineTotal: (product?.price || 0) * item.quantity,
        };
      }),
      bill: {
        subtotal,
        discount,
        taxAmount,
        totalAmount: params.amount || totalAmount,
        currency: 'USD',
      },
      courier: {
        serviceName: 'BlueDart',
        trackingId: `BD${Date.now()}`,
        homePageUrl: 'https://www.bluedart.com/',
      },
      status: 'paid',
      purchasedAt: new Date().toISOString(),
    };
  }

  private formatAddress(user: User): string {
    if (!user.address) {
      return 'Address not available';
    }
    return [
      user.address.homeOrOfficeNumber,
      user.address.street,
      user.address.landmark,
      user.address.city,
      user.address.state,
      user.address.pin,
    ].filter(Boolean).join(', ');
  }

  private getStoredOrders(): PurchasedOrder[] {
    const savedOrders = localStorage.getItem(this.ordersKey);
    if (!savedOrders) {
      return [];
    }
    try {
      return JSON.parse(savedOrders) as PurchasedOrder[];
    } catch {
      return [];
    }
  }

  private upsertOrder(order: PurchasedOrder): void {
    const orders = this.getStoredOrders();
    const nextOrders = orders.some((item) => item.id === order.id)
      ? orders.map((item) => (item.id === order.id ? order : item))
      : [...orders, order];
    localStorage.setItem(this.ordersKey, JSON.stringify(nextOrders));
  }

  private createResponse<T>(data: T, message: string, statusCode = 200): ApiResponse<T> {
    return {
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
