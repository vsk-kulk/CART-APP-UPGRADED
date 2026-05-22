import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Product } from './product.service';

export interface CartItem {
  productId: string;
  product?: Product;
  quantity: number;
  addedDate: Date;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalPrice: number;
  lastUpdated: Date;
  isFavorite?: boolean;
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
export class CartService {
  private apiUrl = 'http://localhost:8080/api/cart';
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCart();
  }

  // Get cart items
  getCart(): Observable<ApiResponse<Cart>> {
    return this.http.get<ApiResponse<Cart>>(`${this.apiUrl}`).pipe(
      tap((response) => {
        if (response.statusCode === 200) {
          this.cartSubject.next(response.data.items);
        }
      }),
      catchError(() => of(this.createCartResponse(this.cartSubject.value, 'Mock cart loaded. Backend API was not reachable.')))
    );
  }

  // Add item to cart
  addToCart(productId: string, quantity: number = 1): Observable<ApiResponse<Cart>> {
    return this.http
      .post<ApiResponse<Cart>>(`${this.apiUrl}/add`, { productId, quantity })
      .pipe(
        tap((response) => {
          if (response.statusCode === 201) {
            this.cartSubject.next(response.data.items);
            this.persistCart(response.data.items);
          }
        }),
        catchError(() => {
          const items = this.upsertLocalItem(productId, quantity);
          return of(this.createCartResponse(items, 'Product added to local cart fallback.', 201));
        })
      );
  }

  // Update cart item quantity
  updateQuantity(productId: string, quantity: number): Observable<ApiResponse<Cart>> {
    return this.http
      .put<ApiResponse<Cart>>(`${this.apiUrl}/update/${productId}`, { quantity })
      .pipe(
        tap((response) => {
          if (response.statusCode === 200) {
            this.cartSubject.next(response.data.items);
            this.persistCart(response.data.items);
          }
        }),
        catchError(() => {
          const items = this.cartSubject.value
            .map((item) => (item.productId === productId ? { ...item, quantity } : item))
            .filter((item) => item.quantity > 0);
          this.cartSubject.next(items);
          this.persistCart(items);
          return of(this.createCartResponse(items, 'Cart quantity updated locally.'));
        })
      );
  }

  // Remove item from cart
  removeFromCart(productId: string): Observable<ApiResponse<Cart>> {
    return this.http.delete<ApiResponse<Cart>>(`${this.apiUrl}/${productId}`).pipe(
      tap((response) => {
        if (response.statusCode === 200) {
          this.cartSubject.next(response.data.items);
          this.persistCart(response.data.items);
        }
      }),
      catchError(() => {
        const items = this.cartSubject.value.filter((item) => item.productId !== productId);
        this.cartSubject.next(items);
        this.persistCart(items);
        return of(this.createCartResponse(items, 'Product removed from local cart fallback.'));
      })
    );
  }

  // Add to favorites
  addToFavorites(productId: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/favorites`, { productId });
  }

  // Remove from favorites
  removeFromFavorites(productId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/favorites/${productId}`);
  }

  // Get favorites
  getFavorites(): Observable<ApiResponse<CartItem[]>> {
    return this.http.get<ApiResponse<CartItem[]>>(`${this.apiUrl}/favorites`);
  }

  // Save cart for later
  saveCart(): Observable<ApiResponse<Cart>> {
    return this.http.post<ApiResponse<Cart>>(`${this.apiUrl}/save`, {}).pipe(
      catchError(() => of(this.createCartResponse(this.cartSubject.value, 'Cart saved locally until backend is available.')))
    );
  }

  // Clear cart
  clearCart(): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/clear`).pipe(
      tap((response) => {
        if (response.statusCode === 200) {
          this.cartSubject.next([]);
          this.persistCart([]);
        }
      }),
      catchError(() => {
        this.cartSubject.next([]);
        this.persistCart([]);
        return of({ statusCode: 200, message: 'Cart cleared locally', data: undefined, timestamp: new Date().toISOString() });
      })
    );
  }

  // Local cart management (fallback for offline)
  private loadCart(): void {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cart = JSON.parse(savedCart) as CartItem[];
        this.cartSubject.next(cart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }

  // Get current cart items
  getCurrentCart(): CartItem[] {
    return this.cartSubject.value;
  }

  // Calculate total price
  calculateTotal(items: CartItem[]): number {
    return items.reduce((total, item) => total + (item.product?.price || 0) * item.quantity, 0);
  }

  private upsertLocalItem(productId: string, quantity: number): CartItem[] {
    const existing = this.cartSubject.value.find((item) => item.productId === productId);
    const items = existing
      ? this.cartSubject.value.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item
        )
      : [...this.cartSubject.value, { productId, quantity, addedDate: new Date() }];
    this.cartSubject.next(items);
    this.persistCart(items);
    return items;
  }

  private persistCart(items: CartItem[]): void {
    localStorage.setItem('cart', JSON.stringify(items));
  }

  private createCartResponse(items: CartItem[], message: string, statusCode: number = 200): ApiResponse<Cart> {
    return {
      statusCode,
      message,
      data: {
        id: 'local-cart',
        userId: 'local-user',
        items,
        totalPrice: this.calculateTotal(items),
        lastUpdated: new Date(),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
