# ShopHub Angular Frontend - Implementation Guide

This guide provides detailed instructions for implementing and extending the ShopHub e-commerce platform.

## Quick Start

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Navigate to http://localhost:4200
```

### 2. File Structure Overview

```
src/app/
├── services/              # API communication & business logic
│   ├── auth.service.ts
│   ├── product.service.ts
│   ├── cart.service.ts
│   ├── payment.service.ts
│   ├── whatsapp-notification.service.ts
│   └── confirm-dialog.service.ts
│
├── interceptors/          # HTTP interceptors
│   └── auth.interceptor.ts
│
├── guards/                # Route guards
│   └── auth.guard.ts
│
├── components/
│   ├── shared/            # Shared components
│   │   ├── navbar/
│   │   ├── confirm-dialog/
│   │   └── notification-toast/
│   ├── product/           # Product-related components
│   ├── cart/              # Cart components
│   ├── payment/           # Payment components
│   ├── admin/             # Admin components
│   └── seller/            # Seller components
│
├── pages/                 # Feature modules (lazy loaded)
│   ├── login/
│   ├── register/
│   ├── product-list/
│   ├── product-detail/
│   ├── cart/
│   ├── payment/
│   ├── payment-confirmation/
│   ├── seller/
│   └── admin/
│
└── app.module.ts          # Root module
```

## Implementation Checklist

### Phase 1: Core Setup ✅
- [x] Project structure created
- [x] Services implemented
- [x] Interceptors configured
- [x] Guards created
- [x] Shared components created

### Phase 2: Complete Component Implementation

#### Shared Components
- [ ] Navbar - Complete with responsive menu
- [ ] Confirm Dialog - All dialog types
- [ ] Notification Toast - All notification types

#### Product Components
- [ ] Product List Page
  - [ ] Product grid display (medium size)
  - [ ] Price and name bold styling
  - [ ] Hover effects with cursor movement
  - [ ] Product filters (price range, sort, seller)
  - [ ] Search functionality
  
- [ ] Product Detail Page
  - [ ] Full product information
  - [ ] Related products
  - [ ] Reviews section
  - [ ] Add to cart functionality
  - [ ] Add to favorites

#### Cart Components
- [ ] Cart List Page
  - [ ] Display cart items
  - [ ] Quantity adjustment with confirmation
  - [ ] Item removal with confirmation
  - [ ] Cart summary (total, tax, shipping)
  - [ ] Continue shopping button
  - [ ] Checkout button
  - [ ] Save cart option
  
- [ ] Cart Item Component
  - [ ] Product image and details
  - [ ] Quantity selector
  - [ ] Remove button
  - [ ] Item total

#### Payment Components
- [ ] Payment Page
  - [ ] Order review
  - [ ] Shipping address
  - [ ] Billing address
  - [ ] "Continue to Payment" button
  - [ ] Call Stripe API
  
- [ ] Payment Confirmation Page
  - [ ] Success/Failure message
  - [ ] Order ID
  - [ ] Amount paid
  - [ ] Transaction ID
  - [ ] Download invoice
  - [ ] Continue shopping button

#### Seller Components
- [ ] Seller Dashboard
  - [ ] Product list with edit/delete options
  - [ ] Add new product form
  - [ ] Sales analytics
  - [ ] Order management
  
- [ ] Product Form
  - [ ] Product details input
  - [ ] Image upload
  - [ ] Pricing
  - [ ] Stock management
  - [ ] Confirmation before submit

#### Admin Components
- [ ] Admin Dashboard
  - [ ] Pending approvals list
  - [ ] User management
  - [ ] Seller management
  - [ ] Payment history
  - [ ] Analytics/Reports
  
- [ ] Approval Component
  - [ ] Product review
  - [ ] Approve/Reject buttons
  - [ ] WhatsApp approval status

#### Auth Components (Pages)
- [ ] Login Page
  - [ ] Email/password form
  - [ ] Remember me option
  - [ ] Forgot password link
  - [ ] Register link
  
- [ ] Register Page
  - [ ] User/Seller role selection
  - [ ] Form validation
  - [ ] WhatsApp number input
  - [ ] Terms acceptance
  - [ ] Submit button

### Phase 3: Feature Implementation

#### Confirmation Dialogs
```typescript
// Template usage
this.confirmDialogService.openConfirmDialog({
  title: 'Add to Cart',
  message: 'Do you want to add this product to cart?',
  confirmText: 'Add',
  cancelText: 'Cancel',
  type: 'add'
});

this.confirmDialogService.result$.subscribe(result => {
  if (result?.confirmed) {
    // Perform action
  }
});
```

#### Hover Effects on Products
```scss
.product-card {
  transition: all var(--transition-normal);
  cursor: pointer;

  &:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-xl);
  }
}
```

#### WhatsApp Notifications
```typescript
// Send notification when product is added
this.whatsappService.sendNotification({
  recipientNumber: adminNumber,
  type: 'product_added',
  productId: newProduct.id,
  productName: newProduct.name,
  sellerName: currentUser.name
}).subscribe();

// Admin receives message: "New product 'XYZ' added by Seller Name"
// Admin clicks approve/reject button in WhatsApp
```

#### Cache Eviction
```typescript
// Products cached for 30 minutes automatically
// Manual cache invalidation on product changes
this.productService.invalidateCache(); // Internal method

// Check cache age in service
if (now - this.lastCacheTime < this.cacheExpiry) {
  // Use cached data
}
```

#### Cart Persistence
```typescript
// Cart saved to backend
this.cartService.saveCart().subscribe();

// Cart loaded on login
this.cartService.getCart().subscribe();

// Local fallback
localStorage.setItem('cart', JSON.stringify(cartItems));
```

#### Stripe Payment Integration
```typescript
// Backend returns Stripe session URL
this.paymentService.initiatePayment({
  cartId: cart.id,
  amount: total,
  currency: 'INR',
  email: user.email
}).subscribe(response => {
  // Redirect to Stripe checkout
  window.location.href = response.data.paymentUrl;
});

// After Stripe redirects back
this.paymentService.confirmPayment(sessionId).subscribe(result => {
  if (result.data.status === 'success') {
    // Show payment confirmation page
  }
});
```

## Step-by-Step Implementation Guide

### Step 1: Create Component Structure

```bash
# Create component directories
ng generate module pages/login --routing
ng generate module pages/register --routing
ng generate module pages/product-list --routing
ng generate module pages/product-detail --routing
ng generate module pages/cart --routing
ng generate module pages/payment --routing
ng generate module pages/seller --routing
ng generate module pages/admin --routing

# Create components within modules
ng generate component components/product/product-card
ng generate component components/product/product-filter
ng generate component components/cart/cart-item
ng generate component pages/payment/payment-form
```

### Step 2: Implement Services

Each service should follow this pattern:

```typescript
@Injectable({
  providedIn: 'root',
})
export class YourService {
  private apiUrl = 'http://localhost:8080/api/endpoint';

  constructor(private http: HttpClient) {}

  // Methods
  getData(): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(this.apiUrl);
  }

  addData(data: T): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.apiUrl, data);
  }
}
```

### Step 3: Create Module for Each Feature

```typescript
// pages/login/login.module.ts
@NgModule({
  declarations: [LoginComponent],
  imports: [
    CommonModule,
    LoginRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class LoginModule {}
```

### Step 4: Add Routes

```typescript
// pages/login/login-routing.module.ts
const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoginRoutingModule {}
```

### Step 5: Implement Components

```typescript
// Component with dependency injection
export class ProductListComponent implements OnInit {
  products$ = this.productService.getProducts();
  filters: ProductFilter = {};
  
  constructor(
    private productService: ProductService,
    private confirmDialog: ConfirmDialogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.getProducts(this.filters).subscribe(response => {
      if (response.statusCode === 200) {
        // Use response.data
      }
    });
  }

  addToCart(product: Product): void {
    this.confirmDialog.openConfirmDialog({
      title: 'Add to Cart',
      message: `Add ${product.name} to cart?`,
      confirmText: 'Add',
      type: 'add'
    });

    this.confirmDialog.result$.subscribe(result => {
      if (result?.confirmed) {
        this.cartService.addToCart(product.id).subscribe(
          response => {
            if (response.statusCode === 201) {
              this.showSuccess(`Added ${product.name} to cart`);
            }
          }
        );
      }
    });
  }

  private showSuccess(message: string): void {
    // Use NotificationToastComponent to show message
  }
}
```

## API Integration Pattern

All API calls should follow this pattern:

```typescript
// 1. Call API
this.service.getData().subscribe(
  (response) => {
    // 2. Check status code
    if (response.statusCode === 200) {
      // 3. Use data
      this.data = response.data;
    } else if (response.statusCode === 400) {
      // Handle error
      this.showError(response.message);
    }
  },
  (error) => {
    // 4. Handle HTTP error
    if (error.status === 401) {
      this.router.navigate(['/login']);
    } else if (error.status === 500) {
      this.showError('Server error. Please try again later.');
    }
  }
);
```

## Styling Guidelines

Use CSS variables for consistency:

```scss
// Colors
color: var(--primary);
background: var(--danger);
border-color: var(--gray-300);

// Spacing
padding: var(--radius-lg);
margin: 2rem 0;

// Shadows
box-shadow: var(--shadow-md);

// Transitions
transition: all var(--transition-normal);

// Responsive
@media (max-width: 768px) {
  // Mobile styles
}
```

## Testing Checklist

- [ ] Register new user
- [ ] Login with credentials
- [ ] Browse products with filters
- [ ] Search products
- [ ] Add product to cart (confirm dialog)
- [ ] Remove from cart (confirm dialog)
- [ ] Update quantity
- [ ] Save cart for later
- [ ] Add/remove favorites
- [ ] Initiate Stripe payment
- [ ] Complete payment
- [ ] View order confirmation
- [ ] Add product as seller
- [ ] Approve product as admin
- [ ] Receive WhatsApp notifications

## Debugging Tips

1. **Check Network Tab**: Verify API calls in browser DevTools
2. **Console Logs**: Add logs at key points
3. **localStorage**: Check for cached data
4. **Service State**: Use Angular DevTools to inspect services
5. **Router Events**: Debug navigation issues
6. **HTTP Status Codes**: Map backend responses to UI states

## Common Issues & Solutions

### Issue: API returns 401 Unauthorized
**Solution**: Token expired. Refresh using `/auth/refresh` or redirect to login.

### Issue: Cart not syncing between components
**Solution**: Use BehaviorSubject in CartService, subscribe to cart$ Observable

### Issue: WhatsApp notifications not sending
**Solution**: Verify phone numbers in E.164 format (+country_code...)

### Issue: Payment stuck on Stripe page
**Solution**: Check Stripe public key, verify API responses, check browser console

## Performance Optimization

1. **Lazy Loading**: All feature modules are lazy-loaded
2. **OnPush Change Detection**: Use for pure components
3. **Unsubscribe**: Use takeUntil() to prevent memory leaks
4. **TrackBy Function**: In *ngFor loops

```typescript
trackByProductId(index: number, item: Product): string {
  return item.id;
}
```

## Deployment Checklist

- [ ] Update environment variables
- [ ] Build for production: `npm run build`
- [ ] Test production build locally
- [ ] Update API URLs
- [ ] Configure CORS on backend
- [ ] Set up HTTPS
- [ ] Deploy to hosting (Vercel, Netlify, AWS)
- [ ] Test all features in production
- [ ] Monitor error logs

## Next Steps

1. Implement all component templates and styles
2. Connect services to all components
3. Add comprehensive error handling
4. Implement loading states and spinners
5. Add responsive design for mobile
6. Write unit tests
7. Setup CI/CD pipeline
8. Deploy to production

---

For questions or issues, refer to API_DOCUMENTATION.md or README.md
