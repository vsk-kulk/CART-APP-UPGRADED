import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/products', pathMatch: 'full' },
  { path: 'login', loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginModule) },
  { path: 'register', loadChildren: () => import('./pages/register/register.module').then((m) => m.RegisterModule) },
  {
    path: 'products',
    loadChildren: () => import('./pages/product-list/product-list.module').then((m) => m.ProductListModule),
  },
  {
    path: 'products/:id',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/product-detail/product-detail.module').then((m) => m.ProductDetailModule),
  },
  {
    path: 'cart',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/cart/cart.module').then((m) => m.CartModule),
  },
  {
    path: 'payment',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/payment/payment.module').then((m) => m.PaymentModule),
  },
  {
    path: 'payment-confirmation',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/payment-confirmation/payment-confirmation.module').then((m) => m.PaymentConfirmationModule),
  },
  {
    path: 'seller',
    canActivate: [AuthGuard],
    data: { roles: ['seller'] },
    loadChildren: () => import('./pages/seller/seller.module').then((m) => m.SellerModule),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { roles: ['admin'] },
    loadChildren: () => import('./pages/admin/admin.module').then((m) => m.AdminModule),
  },
  { path: '**', redirectTo: '/products' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { enableTracing: false })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
