import { Component, OnInit } from '@angular/core';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { Product, ProductService } from '@services/product.service';
import {
  AdminWhatsAppSettings,
  ApprovalAction,
  WhatsAppNotificationService,
} from '@services/whatsapp-notification.service';
import { take } from 'rxjs/operators';

interface AdminRecord {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'seller' | 'admin';
  status: 'active' | 'pending' | 'rejected';
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: false,
})
export class AdminComponent implements OnInit {
  search = '';
  products: Product[] = [];
  message = '';
  whatsappSettings: AdminWhatsAppSettings = {
    enabled: true,
    recipientNumber: '+919900001001',
  };
  users: AdminRecord[] = [
    { id: 'admin-1', name: 'Admin Lead', email: 'admin@shophub.test', role: 'admin', status: 'active' },
    { id: 'user-1', name: 'Anika Rao', email: 'user1@shophub.test', role: 'user', status: 'active' },
    { id: 'user-2', name: 'Rahul Menon', email: 'user2@shophub.test', role: 'user', status: 'active' },
    { id: 'user-3', name: 'Meera Shah', email: 'user3@shophub.test', role: 'user', status: 'active' },
    { id: 'seller-1', name: 'Urban Cart Co', email: 'seller1@shophub.test', role: 'seller', status: 'active' },
    { id: 'seller-2', name: 'Fresh Home Sellers', email: 'seller2@shophub.test', role: 'seller', status: 'active' },
    { id: 'seller-3', name: 'Tech Basket', email: 'seller3@shophub.test', role: 'seller', status: 'pending' },
    { id: 'seller-4', name: 'Style Yard', email: 'seller4@shophub.test', role: 'seller', status: 'pending' },
  ];

  constructor(
    private productService: ProductService,
    private confirmDialogService: ConfirmDialogService,
    private whatsappService: WhatsAppNotificationService
  ) {}

  ngOnInit(): void {
    this.whatsappSettings = this.whatsappService.getAdminWhatsAppSettings();
    this.productService.getProducts().subscribe((response) => (this.products = response.data));
  }

  get filteredUsers(): AdminRecord[] {
    return this.users.filter((record) => record.role !== 'seller' && this.matches(record.name, record.email, record.role));
  }

  get filteredSellers(): AdminRecord[] {
    return this.users.filter((record) => record.role === 'seller' && this.matches(record.name, record.email, record.status));
  }

  get filteredProducts(): Product[] {
    return this.products.filter((product) =>
      this.matches(product.name, product.sellerName, product.category)
    );
  }

  removeUser(record: AdminRecord): void {
    this.confirmDialogService.openConfirmDialog({
      title: 'Remove record',
      message: 'Are you sure to Remove ?',
      confirmText: 'Remove',
      type: 'remove',
    });
    this.confirmDialogService.result$.pipe(take(1)).subscribe((result) => {
      if (!result.confirmed) return;
      this.users = this.users.filter((item) => item.id !== record.id);
      this.message = `${record.name} removed from admin list.`;
    });
  }

  removeProduct(product: Product): void {
    this.confirmDialogService.openConfirmDialog({
      title: 'Remove product',
      message: 'Are you sure to Remove ?',
      confirmText: 'Remove',
      type: 'remove',
    });
    this.confirmDialogService.result$.pipe(take(1)).subscribe((result) => {
      if (!result.confirmed) return;
      this.productService.deleteProduct(product.id).subscribe({
        next: () => {
          this.products = this.products.filter((item) => item.id !== product.id);
          this.message = `${product.name} removed.`;
        },
        error: () => {
          this.products = this.products.filter((item) => item.id !== product.id);
          this.message = `${product.name} removed locally.`;
        },
      });
    });
  }

  approveProduct(product: Product, action: ApprovalAction['action']): void {
    this.confirmDialogService.openConfirmDialog({
      title: action === 'approve' ? 'Approve product' : 'Reject product',
      message: action === 'approve' ? 'Are you sure to Approve ?' : 'Are you sure to Reject ?',
      confirmText: action === 'approve' ? 'Approve' : 'Reject',
      type: action === 'approve' ? 'add' : 'warning',
    });
    this.confirmDialogService.result$.pipe(take(1)).subscribe((result) => {
      if (!result.confirmed) return;
      this.whatsappService
        .processApprovalAction({ notificationId: product.id, action })
        .subscribe({ error: () => undefined });
      product.status = action === 'approve' ? 'approved' : 'rejected';
      this.message = `${product.name} ${product.status} through admin approval flow.`;
    });
  }

  approveSeller(record: AdminRecord, action: ApprovalAction['action']): void {
    this.confirmDialogService.openConfirmDialog({
      title: action === 'approve' ? 'Approve seller' : 'Reject seller',
      message: action === 'approve' ? 'Are you sure to Approve ?' : 'Are you sure to Reject ?',
      confirmText: action === 'approve' ? 'Approve' : 'Reject',
      type: action === 'approve' ? 'add' : 'warning',
    });
    this.confirmDialogService.result$.pipe(take(1)).subscribe((result) => {
      if (!result.confirmed) return;
      record.status = action === 'approve' ? 'active' : 'rejected';
      this.whatsappService
        .processApprovalAction({ notificationId: record.id, action })
        .subscribe({ error: () => undefined });
      this.message = `${record.name} ${record.status}. WhatsApp action sent to backend.`;
    });
  }

  saveWhatsAppSettings(): void {
    const recipientNumber = this.whatsappService.formatPhoneNumber(this.whatsappSettings.recipientNumber);

    if (!this.whatsappService.verifyWhatsAppNumber(recipientNumber)) {
      this.message = 'Enter a valid WhatsApp number with country code.';
      return;
    }

    this.whatsappSettings = {
      ...this.whatsappSettings,
      recipientNumber,
    };
    this.whatsappService.saveAdminWhatsAppSettings(this.whatsappSettings);
    this.message = this.whatsappSettings.enabled
      ? `Admin WhatsApp alerts enabled for ${recipientNumber}.`
      : 'Admin WhatsApp alerts disabled.';
  }

  openWhatsAppTest(): void {
    const recipientNumber = this.whatsappService.formatPhoneNumber(this.whatsappSettings.recipientNumber);

    if (!this.whatsappService.verifyWhatsAppNumber(recipientNumber)) {
      this.message = 'Enter a valid WhatsApp number with country code.';
      return;
    }

    window.open(
      this.whatsappService.createWhatsAppLink('ShopHub admin WhatsApp alerts are connected.', recipientNumber),
      '_blank'
    );
  }

  private matches(...values: string[]): boolean {
    const query = this.search.trim().toLowerCase();
    if (!query) return true;
    return values.some((value) => value.toLowerCase().includes(query));
  }
}
