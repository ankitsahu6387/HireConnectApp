import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = `${environment.apiUrl}/notify`;

  constructor(private http: HttpClient) {}

  getByUser(userId: number, unreadOnly = false): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}`, {
      params: { unreadOnly }
    });
  }

  getUnreadCount(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}/unread-count`);
  }

  markAsRead(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/read`, {});
  }

  markAllAsRead(userId: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/user/${userId}/read-all`, {});
  }
}
