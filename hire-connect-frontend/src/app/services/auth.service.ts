import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;
  
  private currentUserSubject = new BehaviorSubject<any>(this.getUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, data).pipe(
      tap((res: any) => this.handleAuthResponse(res))
    );
  }

  sendRegistrationOtp(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/send-registration-otp`, { email }, { responseType: 'text' });
  }

  verifyRegistrationOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/verify-registration-otp`, { email, otp }, { responseType: 'text' });
  }

  sendPasswordResetOtp(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/send-password-reset-otp`, { email }, { responseType: 'text' });
  }

  verifyPasswordResetOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/verify-password-reset-otp`, { email, otp }, { responseType: 'text' });
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, data, { responseType: 'text' });
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, data).pipe(
      tap((res: any) => this.handleAuthResponse(res))
    );
  }

  getOAuthLoginUrl(provider: 'google' | 'github', role?: 'CANDIDATE' | 'EMPLOYER'): string {
    const roleQuery = role ? `?role=${encodeURIComponent(role)}` : '';
    return `${environment.apiUrl}/oauth2/authorization/${provider}${roleQuery}`;
  }

  startOAuthLogin(provider: 'google' | 'github', role?: 'CANDIDATE' | 'EMPLOYER') {
    window.location.href = this.getOAuthLoginUrl(provider, role);
  }

  completeOAuthLogin(data: any) {
    this.handleAuthResponse({
      token: data.token,
      name: data.name,
      email: data.email,
      role: data.role,
      userId: data.userId
    });
  }

  private handleAuthResponse(res: any) {
    if (res && res.token) {
      this.saveToken(res.token);
      const user = {
        name: res.name || res.username || '',
        email: res.email,
        role: res.role,
        userId: res.userId
      };
      this.saveUser(user);
      setTimeout(() => this.currentUserSubject.next(user));
      if (!user.name) {
        setTimeout(() => this.refreshCurrentUserProfile());
      }
    }
  }

  refreshCurrentUserProfile() {
    const user = this.getUser();
    if (!user?.userId || !this.getToken()) return;

    this.http.get<any>(`${environment.apiUrl}/users/${user.userId}`).subscribe({
      next: (profile) => {
        const refreshedUser = {
          ...user,
          name: profile?.name || user.name || '',
          email: profile?.email || user.email,
          role: profile?.role || user.role
        };
        this.saveUser(refreshedUser);
        this.currentUserSubject.next(refreshedUser);
      },
      error: () => this.currentUserSubject.next(user)
    });
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  saveUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
