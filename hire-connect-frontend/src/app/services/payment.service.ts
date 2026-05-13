import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private paymentUrl = `${environment.apiUrl}/payment`;
  private subUrl = `${environment.apiUrl}/subscription`;

  constructor(private http: HttpClient) {}

  createOrder(amount: number): Observable<any> {
    return this.http.post(`${this.paymentUrl}/create?amount=${amount}`, {}, { responseType: 'text' });
  }

  getPaymentKey(): Observable<any> {
    return this.http.get(`${this.paymentUrl}/key`);
  }

  verifyPayment(data: { userId: string, paymentId: string, orderId: string, plan?: string, signature?: string }): Observable<any> {
    return this.http.post(`${this.paymentUrl}/verify`, data);
  }

  createSubscription(data: { userId: number, plan: string }): Observable<any> {
    return this.http.post(`${this.subUrl}/create`, data);
  }

  getSubscription(userId: number): Observable<any> {
    return this.http.get(`${this.subUrl}/${userId}`);
  }
}
