import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private baseUrl = `${environment.apiUrl}/interviews`;

  constructor(private http: HttpClient) {}

  scheduleInterview(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  getByApplication(applicationId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/application/${applicationId}`);
  }

  getByUser(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}`);
  }

  getByJob(jobId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/job/${jobId}`);
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/status`, { status });
  }

  confirmInterview(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/confirm`, {});
  }

  requestReschedule(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/reschedule-request`, data);
  }
}
