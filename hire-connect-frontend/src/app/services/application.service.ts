import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {

  private baseUrl = `${environment.apiUrl}/applications`;

  constructor(private http: HttpClient) {}

  applyJob(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  getByUser(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}`);
  }

  getByJob(jobId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/job/${jobId}`);
  }

  hasApplied(userId: number, jobId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}/job/${jobId}`);
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/status`, { status });
  }
}
