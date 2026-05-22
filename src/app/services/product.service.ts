import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, shareReplay } from 'rxjs/operators';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  sellerName: string;
  sellerId: string;
  rating: number;
  reviews: number;
  stock: number;
  createdDate?: Date;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ProductFilter {
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price-low' | 'price-high' | 'newest' | 'rating';
  sellerId?: string;
  category?: string;
  includeOutOfStock?: boolean;
}

interface PurchasedItem {
  productId: string;
  quantity: number;
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
export class ProductService {
  private apiUrl = 'http://localhost:8080/api/products';
  private cachedProducts$ = new BehaviorSubject<Product[]>([]);
  private cacheExpiry = 30 * 60 * 1000; // 30 minutes
  private lastCacheTime = 0;
  private readonly stockOverridesKey = 'productStockOverrides';
  private readonly mockProducts: Product[] = [
    { id: 'prod-1', name: 'Wireless Keyboard', description: 'Compact Bluetooth keyboard for home and office use.', price: 2499, category: 'Electronics', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600', sellerName: 'Tech Basket', sellerId: 'seller-3', rating: 4.5, reviews: 128, stock: 34, createdDate: new Date('2026-05-01'), status: 'approved' },
    { id: 'prod-2', name: 'Cotton Shirt', description: 'Breathable regular-fit shirt in a soft cotton weave.', price: 1299, category: 'Fashion', image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600', sellerName: 'Style Yard', sellerId: 'seller-4', rating: 4.2, reviews: 84, stock: 52, createdDate: new Date('2026-04-29'), status: 'approved' },
    { id: 'prod-3', name: 'Ceramic Dinner Set', description: 'Six-piece glazed ceramic dinner set for daily meals.', price: 1899, category: 'Home', image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600', sellerName: 'Fresh Home Sellers', sellerId: 'seller-2', rating: 4.6, reviews: 67, stock: 22, createdDate: new Date('2026-05-03'), status: 'approved' },
    { id: 'prod-4', name: 'Running Shoes', description: 'Lightweight shoes with cushioned soles and mesh upper.', price: 3499, category: 'Sports', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', sellerName: 'Urban Cart Co', sellerId: 'seller-1', rating: 4.7, reviews: 210, stock: 41, createdDate: new Date('2026-05-08'), status: 'approved' },
    { id: 'prod-5', name: 'Smart Watch', description: 'Fitness tracking, calls, heart-rate monitor, and long battery life.', price: 5999, category: 'Electronics', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', sellerName: 'Tech Basket', sellerId: 'seller-3', rating: 4.4, reviews: 156, stock: 18, createdDate: new Date('2026-05-10'), status: 'approved' },
    { id: 'prod-6', name: 'Desk Lamp', description: 'Adjustable LED desk lamp with three brightness settings.', price: 999, category: 'Home', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600', sellerName: 'Fresh Home Sellers', sellerId: 'seller-2', rating: 4.1, reviews: 45, stock: 64, createdDate: new Date('2026-04-24'), status: 'approved' },
    { id: 'prod-7', name: 'Travel Backpack', description: 'Water-resistant backpack with laptop pocket and organizer panels.', price: 2199, category: 'Travel', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600', sellerName: 'Urban Cart Co', sellerId: 'seller-1', rating: 4.8, reviews: 98, stock: 39, createdDate: new Date('2026-05-11'), status: 'approved' },
    { id: 'prod-8', name: 'Yoga Mat', description: 'Anti-slip exercise mat with comfortable cushioning.', price: 799, category: 'Sports', image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600', sellerName: 'Urban Cart Co', sellerId: 'seller-1', rating: 4.3, reviews: 73, stock: 80, createdDate: new Date('2026-05-05'), status: 'approved' },
    { id: 'prod-9', name: 'Denim Jacket', description: 'Classic denim jacket with a medium wash and metal buttons.', price: 2799, category: 'Fashion', image: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=600', sellerName: 'Style Yard', sellerId: 'seller-4', rating: 4.0, reviews: 38, stock: 25, createdDate: new Date('2026-05-12'), status: 'pending' },
    { id: 'prod-10', name: 'Coffee Maker', description: 'Easy-clean drip coffee maker for six cups.', price: 3199, category: 'Kitchen', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600', sellerName: 'Fresh Home Sellers', sellerId: 'seller-2', rating: 4.5, reviews: 119, stock: 17, createdDate: new Date('2026-05-13'), status: 'approved' },
    { id: 'prod-11', name: 'Bluetooth Speaker', description: 'Portable speaker with deep bass and splash resistance.', price: 1799, category: 'Electronics', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600', sellerName: 'Tech Basket', sellerId: 'seller-3', rating: 4.2, reviews: 91, stock: 33, createdDate: new Date('2026-05-14'), status: 'approved' },
    { id: 'prod-12', name: 'Steel Bottle', description: 'Insulated bottle that keeps drinks cold or hot for hours.', price: 699, category: 'Travel', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600', sellerName: 'Urban Cart Co', sellerId: 'seller-1', rating: 4.6, reviews: 134, stock: 120, createdDate: new Date('2026-05-09'), status: 'approved' },
  ];

  constructor(private http: HttpClient) {
    this.startCacheEviction();
  }

  // Get all products with filtering and sorting
  getProducts(filters?: ProductFilter): Observable<ApiResponse<Product[]>> {
    const now = Date.now();
    
    if (this.cachedProducts$.value.length > 0 && now - this.lastCacheTime < this.cacheExpiry) {
      return new Observable((observer) => {
        observer.next({
          statusCode: 200,
          message: 'Success',
          data: this.filterAndSortProducts(this.getProductsWithStockOverrides(this.cachedProducts$.value), filters),
          timestamp: new Date().toISOString(),
        });
        observer.complete();
      });
    }

    let params = new HttpParams();
    if (filters) {
      if (filters.minPrice !== undefined) params = params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params = params.set('maxPrice', filters.maxPrice.toString());
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
      if (filters.sellerId) params = params.set('sellerId', filters.sellerId);
      if (filters.category) params = params.set('category', filters.category);
    }

    return this.http.get<ApiResponse<Product[]>>(this.apiUrl, { params }).pipe(
      tap((response) => {
        if (response.statusCode === 200) {
          this.cachedProducts$.next(this.getProductsWithStockOverrides(response.data));
          this.lastCacheTime = Date.now();
        }
      }),
      shareReplay(1),
      catchError(() => {
        const products = this.getProductsWithStockOverrides(this.mockProducts);
        const data = this.filterAndSortProducts(products, filters);
        this.cachedProducts$.next(products);
        this.lastCacheTime = Date.now();
        return of({
          statusCode: 200,
          message: 'Mock products loaded. Backend API was not reachable.',
          data,
          timestamp: new Date().toISOString(),
        });
      })
    );
  }

  // Get single product by ID
  getProduct(id: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`).pipe(
      tap((response) => {
        if (response.statusCode === 200) {
          response.data = this.applyStockOverride(response.data);
        }
      }),
      catchError(() => {
        const product = this.mockProducts.find((item) => item.id === id) || this.mockProducts[0];
        return of({ statusCode: 200, message: 'Mock product loaded', data: this.applyStockOverride(product), timestamp: new Date().toISOString() });
      })
    );
  }

  // Add new product (for sellers)
  addProduct(product: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(this.apiUrl, product).pipe(
      tap((response) => {
        if (response.statusCode === 201) {
          this.invalidateCache();
        }
      })
    );
  }

  // Update product
  updateProduct(id: string, product: Partial<Product>): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${id}`, product).pipe(
      tap((response) => {
        if (response.statusCode === 200) {
          this.invalidateCache();
        }
      })
    );
  }

  // Delete product
  deleteProduct(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      tap((response) => {
        if (response.statusCode === 200) {
          this.invalidateCache();
        }
      })
    );
  }

  // Search products
  searchProducts(query: string): Observable<ApiResponse<Product[]>> {
    return this.http.get<ApiResponse<Product[]>>(`${this.apiUrl}/search`, {
      params: new HttpParams().set('q', query),
    });
  }

  // Get product sellers
  getSellers(): Observable<ApiResponse<Array<{ id: string; name: string }>>> {
    return this.http.get<ApiResponse<Array<{ id: string; name: string }>>>(`${this.apiUrl}/sellers`).pipe(
      catchError(() => {
        const sellers = [...new Map(this.mockProducts.map((product) => [product.sellerId, { id: product.sellerId, name: product.sellerName }])).values()];
        return of({ statusCode: 200, message: 'Mock sellers loaded', data: sellers, timestamp: new Date().toISOString() });
      })
    );
  }

  decrementStock(productId: string, quantity: number = 1): Product | null {
    const currentProducts = this.cachedProducts$.value.length
      ? this.cachedProducts$.value
      : this.getProductsWithStockOverrides(this.mockProducts);
    const currentProduct = currentProducts.find((product) => product.id === productId);

    if (!currentProduct || currentProduct.stock <= 0 || quantity <= 0) {
      return null;
    }

    const nextStock = Math.max(currentProduct.stock - quantity, 0);
    const overrides = this.getStockOverrides();
    overrides[productId] = nextStock;
    localStorage.setItem(this.stockOverridesKey, JSON.stringify(overrides));

    const updatedProducts = currentProducts.map((product) =>
      product.id === productId ? { ...product, stock: nextStock } : product
    );
    this.cachedProducts$.next(updatedProducts);
    this.lastCacheTime = Date.now();

    return updatedProducts.find((product) => product.id === productId) || null;
  }

  decrementPurchasedStock(items: PurchasedItem[]): void {
    items.forEach((item) => this.decrementStock(item.productId, item.quantity));
  }

  incrementStock(productId: string, quantity: number = 1): Product | null {
    if (quantity <= 0) {
      return null;
    }

    const currentProducts = this.cachedProducts$.value.length
      ? this.cachedProducts$.value
      : this.getProductsWithStockOverrides(this.mockProducts);
    const currentProduct = currentProducts.find((product) => product.id === productId);
    if (!currentProduct) {
      return null;
    }

    const nextStock = currentProduct.stock + quantity;
    const overrides = this.getStockOverrides();
    overrides[productId] = nextStock;
    localStorage.setItem(this.stockOverridesKey, JSON.stringify(overrides));

    const updatedProducts = currentProducts.map((product) =>
      product.id === productId ? { ...product, stock: nextStock } : product
    );
    this.cachedProducts$.next(updatedProducts);
    this.lastCacheTime = Date.now();

    return updatedProducts.find((product) => product.id === productId) || null;
  }

  // Helper method to filter and sort products locally
  private filterAndSortProducts(products: Product[], filters?: ProductFilter): Product[] {
    let result = filters?.includeOutOfStock ? [...products] : products.filter((product) => product.stock > 0);

    if (filters) {
      if (filters.minPrice !== undefined) {
        result = result.filter((p) => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined) {
        result = result.filter((p) => p.price <= filters.maxPrice!);
      }
      if (filters.sellerId) {
        result = result.filter((p) => p.sellerId === filters.sellerId);
      }
      if (filters.category) {
        result = result.filter((p) => p.category === filters.category);
      }

      if (filters.sortBy) {
        result = result.sort((a, b) => {
          switch (filters.sortBy) {
            case 'price-low':
              return a.price - b.price;
            case 'price-high':
              return b.price - a.price;
            case 'newest':
              return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
            case 'rating':
              return b.rating - a.rating;
            default:
              return 0;
          }
        });
      }
    }

    return result;
  }

  // Cache management
  private invalidateCache(): void {
    this.cachedProducts$.next([]);
    this.lastCacheTime = 0;
  }

  private getProductsWithStockOverrides(products: Product[]): Product[] {
    return products.map((product) => this.applyStockOverride(product));
  }

  private applyStockOverride(product: Product): Product {
    const overrides = this.getStockOverrides();
    const stock = overrides[product.id];
    return typeof stock === 'number' ? { ...product, stock } : { ...product };
  }

  private getStockOverrides(): Record<string, number> {
    const savedOverrides = localStorage.getItem(this.stockOverridesKey);
    if (!savedOverrides) {
      return {};
    }

    try {
      return JSON.parse(savedOverrides) as Record<string, number>;
    } catch {
      return {};
    }
  }

  private startCacheEviction(): void {
    setInterval(() => {
      if (Date.now() - this.lastCacheTime > this.cacheExpiry) {
        this.invalidateCache();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}
