import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaymentRequest {
  cartId: string;
  amount: number;
  currency: string;
  email: string;
}

export interface PaymentResponse {
  statusCode: number;
  message: string;
  data: {
    sessionId: string;
    paymentUrl: string;
    timestamp: string;
  };
}

export interface PaymentConfirmation {
  statusCode: number;
  message: string;
  data: {
    paymentId: string;
    status: 'success' | 'failed' | 'pending';
    orderId: string;
    amount: number;
    transactionId: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl = 'http://localhost:8080/api/payments';

  constructor(private http: HttpClient) {}

  /**
   * Initiate payment process
   * Calls backend which returns Stripe session URL
   */
  initiatePayment(request: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/initiate`, request);
  }

  /**
   * Confirm payment after Stripe redirects back
   * Backend verifies Stripe webhook and confirms payment
   */
  confirmPayment(sessionId: string): Observable<PaymentConfirmation> {
    return this.http.post<PaymentConfirmation>(`${this.apiUrl}/confirm`, { sessionId });
  }

  /**
   * Get payment status
   * Check the current status of a payment
   */
  getPaymentStatus(paymentId: string): Observable<PaymentConfirmation> {
    return this.http.get<PaymentConfirmation>(`${this.apiUrl}/status/${paymentId}`);
  }

  /**
   * Cancel payment
   * Allows user to cancel a pending payment
   */
  cancelPayment(paymentId: string): Observable<{ statusCode: number; message: string }> {
    return this.http.post<{ statusCode: number; message: string }>(
      `${this.apiUrl}/cancel/${paymentId}`,
      {}
    );
  }

  /**
   * Get payment history
   * Retrieve all payments for the logged-in user
   */
  getPaymentHistory(): Observable<{
    statusCode: number;
    message: string;
    data: PaymentConfirmation[];
  }> {
    return this.http.get<{
      statusCode: number;
      message: string;
      data: PaymentConfirmation[];
    }>(`${this.apiUrl}/history`);
  }

  /**
   * Validate payment request
   * Check if payment request is valid before submission
   */
  validatePaymentRequest(request: PaymentRequest): boolean {
    if (!request.cartId || !request.amount || !request.currency || !request.email) {
      return false;
    }
    if (request.amount <= 0) {
      return false;
    }
    return true;
  }
}
