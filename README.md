# ShopHub - E-Commerce Platform

A modern, feature-rich e-commerce platform built with Angular 17 and Spring Boot, offering a complete shopping experience with cart management, payment processing, and admin controls.

## Features

### ✨ Core Features
- **Product Management**: Browse products with detailed filtering and sorting
- **Shopping Cart**: Add/remove items with persistent storage
- **Favorites**: Save favorite items for later purchase
- **Payment Integration**: Stripe-based secure payment processing
- **User Authentication**: Secure login/registration with JWT tokens
- **WhatsApp Notifications**: Real-time updates via WhatsApp

### 🛒 Shopping Features
- Medium-sized product cards with bold pricing
- Advanced filtering (price range, newest, highest rated)
- Seller-based filtering
- Search functionality
- Cart persistence across sessions
- Favorites management

### 💳 Payment System
- Stripe integration
- Payment confirmation flow
- Order tracking
- Transaction history
- Multiple payment methods

### 🔔 Notification System
- WhatsApp notifications for:
  - New product additions
  - Seller registration
  - Payment confirmations
  - Admin approval requests
- Real-time admin approvals via WhatsApp

### 👤 User Roles
- **Customer**: Browse, purchase, manage cart
- **Seller**: Add products, manage inventory
- **Admin**: Approve products, manage sellers, view analytics

### ⚙️ Technical Features
- JWT-based authentication
- 30-minute cache eviction
- Confirmation dialogs for actions
- Responsive design
- Modern UI with smooth animations
- API error handling
- Loading states and spinners

## Project Structure

```
cart-app-upgraded/
├── src/
│   ├── app/
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── product.service.ts
│   │   │   ├── cart.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── whatsapp-notification.service.ts
│   │   │   └── confirm-dialog.service.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   ├── components/
│   │   │   ├── shared/
│   │   │   │   ├── navbar/
│   │   │   │   ├── confirm-dialog/
│   │   │   │   └── notification-toast/
│   │   │   ├── product/
│   │   │   ├── cart/
│   │   │   ├── payment/
│   │   │   ├── admin/
│   │   │   └── seller/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── app.module.ts
│   │   ├── app-routing.module.ts
│   │   ├── app.component.ts
│   │   └── app.component.html
│   ├── styles.scss
│   ├── main.ts
│   └── index.html
├── package.json
├── angular.json
├── tsconfig.json
├── API_DOCUMENTATION.md
└── README.md
```

## Prerequisites

- Node.js 18+ and npm 9+
- Angular CLI 17+
- Spring Boot backend (running on localhost:8080)
- Stripe account (for payment processing)
- Twilio account (for WhatsApp notifications)

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Extract the zip file
unzip cart-app-upgraded.zip
cd cart-app-upgraded

# Install dependencies
npm install
```

### 2. Backend Configuration

Ensure your Spring Boot backend is running on `http://localhost:8080`

Required environment variables:
```properties
# Database
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/shophub
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=3600000

# Stripe
STRIPE_API_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155552671
ADMIN_WHATSAPP_NUMBER=+919876543210
```

### 3. Frontend Configuration

Update API endpoints in environment files if needed:
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
```

### 4. Run the Application

```bash
# Development server
npm start

# The app will open at http://localhost:4200
```

### 5. Build for Production

```bash
npm run build
# Output in dist/ecommerce-cart-app/
```

## API Endpoints

Complete API documentation is available in `API_DOCUMENTATION.md`

### Key Endpoints

**Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout user

**Products**
- `GET /api/products` - Get all products with filters
- `GET /api/products/{id}` - Get product details
- `POST /api/products` - Add new product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

**Cart**
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add to cart
- `PUT /api/cart/update/{productId}` - Update quantity
- `DELETE /api/cart/{productId}` - Remove from cart
- `POST /api/cart/save` - Save cart for later
- `POST /api/cart/favorites` - Add to favorites

**Payment**
- `POST /api/payments/initiate` - Start payment
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/status/{id}` - Check status
- `GET /api/payments/history` - Get transaction history

**Notifications**
- `POST /api/notifications/whatsapp/send` - Send notification
- `POST /api/notifications/admin/approval-request` - Request admin approval
- `POST /api/notifications/admin/process-approval` - Process approval

## Usage Guide

### For Customers

1. **Register/Login**: Create account or sign in
2. **Browse Products**: View all products with filters
3. **Add to Cart**: Click "Add to Cart" button (confirmation dialog appears)
4. **Manage Cart**: 
   - Adjust quantities
   - Remove items
   - Save cart for later
5. **Checkout**: Click "Continue to Payment"
6. **Stripe Payment**: Follow Stripe secure payment flow
7. **Order Confirmation**: View confirmation page with order details

### For Sellers

1. **Register as Seller**: Select seller role during registration
2. **Add Products**: Navigate to Seller Dashboard
3. **Fill Details**: Enter product name, price, description
4. **Confirmation**: Confirm product addition (confirmation dialog)
5. **WhatsApp Notification**: Admin receives WhatsApp notification
6. **Admin Approval**: Admin approves or rejects via WhatsApp

### For Admins

1. **Login as Admin**: Use admin credentials
2. **View Dashboard**: See pending approvals and analytics
3. **Approve/Reject**: Check WhatsApp for approval requests
4. **Process via WhatsApp**: Click approve/reject button in WhatsApp message
5. **Monitor System**: View all transactions and users

## Key Features Implementation

### Confirmation Dialogs

All critical actions show confirmation dialogs:
```typescript
// Example: Add to cart
this.confirmDialogService.openConfirmDialog({
  title: 'Add to Cart',
  message: 'Do you want to add this product to cart?',
  confirmText: 'Add',
  cancelText: 'Cancel',
  type: 'add'
});
```

### WhatsApp Notifications

Notifications sent for:
- New product addition: "New product 'XYZ' added by Seller Name"
- Seller registration: "New seller 'Seller Name' registered"
- Approval requests: Admin receives message with approve/reject buttons

### Cache Management

- Products cached for 30 minutes
- Automatic refresh on add/edit/delete operations
- Cache check runs every 5 minutes

### Cart Persistence

- Cart saved in localStorage for offline access
- Synced with backend when user logs in
- Auto-save on cart modifications

## Customization

### Change Primary Color

Edit `src/styles.scss`:
```scss
--primary: #6366f1;        // Change this
--primary-dark: #4f46e5;
--primary-light: #818cf8;
```

### Change API Base URL

Edit service files:
```typescript
private apiUrl = 'http://your-api-url:8080/api';
```

### Modify Product Display

Edit product component in `src/app/components/product/`:
- Adjust card size
- Customize fields displayed
- Modify styling

## Testing

### Manual Testing

1. **Register**: Create test user account
2. **Add Product**: Test product addition workflow
3. **Cart Operations**: Add/remove/update items
4. **Payment**: Test payment flow with Stripe test cards
5. **Notifications**: Verify WhatsApp messages

### Test Data

Use these Stripe test cards:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0027 6000 3184`
- Decline: `4000 0000 0000 0002`

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Optimization

- Lazy loading of route modules
- OnPush change detection strategy
- HttpClient caching with 30-minute expiry
- Optimized bundle size (~150KB gzipped)
- Image optimization recommendations

## Security Features

- JWT authentication with refresh tokens
- HTTP interceptor for token injection
- CORS protection
- Input validation
- XSS protection
- CSRF tokens for state-changing operations
- Secure password handling

## Troubleshooting

### Backend Connection Error
```
ERROR: HttpErrorResponse {status: 0, statusText: 'Unknown Error'}
```
Solution: Ensure Spring Boot backend is running on localhost:8080

### Token Expired Error
Solution: App automatically refreshes token. If issue persists, clear localStorage and login again.

### Cart Not Persisting
Solution: Check browser localStorage is enabled. Verify backend `/api/cart` endpoint is working.

### WhatsApp Notifications Not Working
Solution: 
- Verify Twilio credentials in backend
- Check admin WhatsApp number is registered
- Verify phone numbers in E.164 format (+country_code...)

## Environment Setup

### Development
```bash
npm start
# or
ng serve --open
```

### Production
```bash
npm run build -- --configuration production
# Deploy dist/ecommerce-cart-app/ folder
```

## Deployment

### On Vercel
```bash
vercel
```

### On Netlify
```bash
npm run build
# Drag and drop dist/ folder
```

### On AWS Amplify
```bash
amplify init
amplify publish
```

## Contributing

1. Create feature branch: `git checkout -b feature/feature-name`
2. Make changes and test thoroughly
3. Commit: `git commit -m 'Add feature'`
4. Push: `git push origin feature/feature-name`
5. Create Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
1. Check API_DOCUMENTATION.md
2. Review error messages in browser console
3. Check backend logs
4. Open an issue on GitHub

## Changelog

### v1.0.0 (2024-05-12)
- Initial release
- All core features implemented
- WhatsApp integration
- Payment processing
- Admin dashboard

---

**Built with ❤️ using Angular 17 & Spring Boot**

For more information, visit [our documentation](./API_DOCUMENTATION.md)
