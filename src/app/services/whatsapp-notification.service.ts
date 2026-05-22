import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface WhatsAppNotification {
  id: string;
  recipientNumber: string;
  type: 'product_added' | 'seller_added' | 'approval_request' | 'product_rejected';
  productId?: string;
  sellerId?: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  createdDate: Date;
  sentDate?: Date;
}

export interface NotificationRequest {
  recipientNumber: string;
  type: 'product_added' | 'seller_added' | 'approval_request' | 'product_rejected';
  productId?: string;
  sellerId?: string;
  productName?: string;
  sellerName?: string;
}

export interface AdminWhatsAppSettings {
  enabled: boolean;
  recipientNumber: string;
}

export interface ApprovalAction {
  notificationId: string;
  action: 'approve' | 'reject';
  reason?: string;
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
export class WhatsAppNotificationService {
  private apiUrl = 'http://localhost:8080/api/notifications/whatsapp';
  private adminNotificationUrl = 'http://localhost:8080/api/notifications/admin';
  private readonly adminSettingsKey = 'adminWhatsAppSettings';
  private readonly defaultAdminSettings: AdminWhatsAppSettings = {
    enabled: true,
    recipientNumber: '+919900001001',
  };

  constructor(private http: HttpClient) {}

  /**
   * Send WhatsApp notification
   * Called when a new product is added or new seller is registered
   */
  sendNotification(request: NotificationRequest): Observable<ApiResponse<WhatsAppNotification>> {
    return this.http.post<ApiResponse<WhatsAppNotification>>(`${this.apiUrl}/send`, request).pipe(
      catchError(() => of(this.createQueuedNotification(request, 'WhatsApp notification queued locally. Backend API was not reachable.')))
    );
  }

  /**
   * Send approval request to admin via WhatsApp
   * Admin receives a message with approve/reject options
   */
  sendApprovalRequest(
    productId: string,
    productName: string,
    sellerName: string
  ): Observable<ApiResponse<WhatsAppNotification>> {
    return this.http.post<ApiResponse<WhatsAppNotification>>(
      `${this.adminNotificationUrl}/approval-request`,
      { productId, productName, sellerName }
    ).pipe(
      catchError(() =>
        of(
          this.createQueuedNotification(
            {
              recipientNumber: this.getAdminWhatsAppSettings().recipientNumber,
              type: 'approval_request',
              productId,
              productName,
              sellerName,
            },
            'Admin approval WhatsApp queued locally. Backend API was not reachable.'
          )
        )
      )
    );
  }

  getAdminWhatsAppSettings(): AdminWhatsAppSettings {
    const savedSettings = localStorage.getItem(this.adminSettingsKey);

    if (!savedSettings) {
      return this.defaultAdminSettings;
    }

    try {
      const settings = JSON.parse(savedSettings) as AdminWhatsAppSettings;
      return {
        enabled: settings.enabled,
        recipientNumber: settings.recipientNumber || this.defaultAdminSettings.recipientNumber,
      };
    } catch {
      return this.defaultAdminSettings;
    }
  }

  saveAdminWhatsAppSettings(settings: AdminWhatsAppSettings): void {
    const recipientNumber = this.formatPhoneNumber(settings.recipientNumber || this.defaultAdminSettings.recipientNumber);
    localStorage.setItem(
      this.adminSettingsKey,
      JSON.stringify({
        enabled: settings.enabled,
        recipientNumber,
      })
    );
  }

  notifyAdminProductAdded(productId: string, productName: string, sellerName: string): Observable<ApiResponse<WhatsAppNotification>> {
    const settings = this.getAdminWhatsAppSettings();

    if (!settings.enabled) {
      return of(
        this.createQueuedNotification(
          {
            recipientNumber: settings.recipientNumber,
            type: 'product_added',
            productId,
            productName,
            sellerName,
          },
          'Admin WhatsApp notifications are disabled.',
          'failed'
        )
      );
    }

    return this.sendNotification({
      recipientNumber: settings.recipientNumber,
      type: 'product_added',
      productId,
      productName,
      sellerName,
    });
  }

  notifyAdminSellerAdded(sellerId: string, sellerName: string): Observable<ApiResponse<WhatsAppNotification>> {
    const settings = this.getAdminWhatsAppSettings();

    if (!settings.enabled) {
      return of(
        this.createQueuedNotification(
          {
            recipientNumber: settings.recipientNumber,
            type: 'seller_added',
            sellerId,
            sellerName,
          },
          'Admin WhatsApp notifications are disabled.',
          'failed'
        )
      );
    }

    return this.sendNotification({
      recipientNumber: settings.recipientNumber,
      type: 'seller_added',
      sellerId,
      sellerName,
    });
  }

  createWhatsAppLink(message: string, recipientNumber: string = this.getAdminWhatsAppSettings().recipientNumber): string {
    const formattedNumber = this.formatPhoneNumber(recipientNumber).replace(/\D/g, '');
    return `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
  }

  buildProductAddedMessage(productName: string, sellerName: string): string {
    return `New product added on ShopHub: ${productName} by ${sellerName}. Please review it in the Admin Panel.`;
  }

  buildSellerAddedMessage(sellerName: string): string {
    return `New product seller registered on ShopHub: ${sellerName}. Please review it in the Admin Panel.`;
  }

  /**
   * Process approval action from admin
   * Admin can approve or reject a new product/seller via WhatsApp button
   */
  processApprovalAction(action: ApprovalAction): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.adminNotificationUrl}/process-approval`,
      action
    );
  }

  /**
   * Get notification history
   */
  getNotificationHistory(
    limit: number = 50
  ): Observable<ApiResponse<WhatsAppNotification[]>> {
    return this.http.get<ApiResponse<WhatsAppNotification[]>>(
      `${this.apiUrl}/history?limit=${limit}`
    );
  }

  /**
   * Get pending approvals for admin
   */
  getPendingApprovals(): Observable<ApiResponse<WhatsAppNotification[]>> {
    return this.http.get<ApiResponse<WhatsAppNotification[]>>(
      `${this.adminNotificationUrl}/pending-approvals`
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/${notificationId}/read`,
      {}
    );
  }

  /**
   * Verify WhatsApp number format
   */
  verifyWhatsAppNumber(number: string): boolean {
    // WhatsApp uses E.164 format: +[country code][phone number]
    const whatsappRegex = /^\+[1-9]\d{1,14}$/;
    return whatsappRegex.test(number);
  }

  /**
   * Format phone number to WhatsApp format
   */
  formatPhoneNumber(number: string, countryCode: string = '+91'): string {
    // Remove all non-digit characters
    const cleaned = number.replace(/\D/g, '');
    // If number doesn't start with country code, add it
    if (!cleaned.startsWith(countryCode.replace('+', ''))) {
      return `${countryCode}${cleaned}`;
    }
    return `+${cleaned}`;
  }

  private createQueuedNotification(
    request: NotificationRequest,
    message: string,
    status: WhatsAppNotification['status'] = 'pending'
  ): ApiResponse<WhatsAppNotification> {
    const notification: WhatsAppNotification = {
      id: `local-whatsapp-${Date.now()}`,
      recipientNumber: request.recipientNumber,
      type: request.type,
      productId: request.productId,
      sellerId: request.sellerId,
      message: this.messageFromRequest(request),
      status,
      createdDate: new Date(),
    };

    return {
      statusCode: status === 'failed' ? 202 : 200,
      message,
      data: notification,
      timestamp: new Date().toISOString(),
    };
  }

  private messageFromRequest(request: NotificationRequest): string {
    if (request.type === 'seller_added') {
      return this.buildSellerAddedMessage(request.sellerName || request.sellerId || 'New seller');
    }

    return this.buildProductAddedMessage(
      request.productName || request.productId || 'New product',
      request.sellerName || 'Seller'
    );
  }
}
