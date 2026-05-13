import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JobService {

  private baseUrl = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient) {}

  getAllJobs(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  searchJobs(filters: { keyword?: string; location?: string; category?: string; type?: string; status?: string }): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, value);
      }
    });
    return this.http.get(this.baseUrl, { params });
  }

  getJobById(id: number, userId?: number): Observable<any> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    return this.http.get(`${this.baseUrl}/${id}`, { params });
  }

  postJob(data: any): Observable<any> {
    return this.http.post(this.baseUrl, data);
  }

  updateJob(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, data);
  }

  deleteJob(id: number, employerId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}/${employerId}`, { responseType: 'text' });
  }

  getJobsByEmployer(employerId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/employer/${employerId}`);
  }
}
