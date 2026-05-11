import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

type OAuthProvider = 'google' | 'github';
type UserRole = 'CANDIDATE' | 'EMPLOYER';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="auth-page oauth-callback-page">
      <div *ngIf="needsRole; else signingIn" class="oauth-callback-status oauth-role-status">
        <a routerLink="/jobs" class="auth-brand oauth-role-brand">
          <span class="auth-brand-mark">H</span>
          <span>HireConnect</span>
        </a>

        <div class="oauth-role-heading">
          <h2 class="eyebrow">Complete signup</h2>
          <h1>Select Role for HireConnect</h1>
          <p *ngIf="oauthEmail">We found a new account for {{ oauthEmail }}. Pick a role to create the right workspace.</p>
        </div>

        <div class="role-selector oauth-role-selector">
          <label class="oauth-role-card">
            <input [(ngModel)]="selectedRole" type="radio" value="CANDIDATE">
            <span>
              <strong>Candidate</strong>
              <small>Find jobs, manage profile, apply for jobs, and track your application progress.</small>
            </span>
          </label>
          <label class="oauth-role-card">
            <input [(ngModel)]="selectedRole" type="radio" value="EMPLOYER">
            <span>
              <strong>Employer</strong>
              <small>Post jobs, review applicants, manage hiring activity, and view recruiting insights.</small>
            </span>
          </label>
        </div>

        <button type="button" class="auth-submit oauth-role-submit" (click)="continueSignup()">
          Continue as {{ selectedRole === 'EMPLOYER' ? 'Employer' : 'Candidate' }}
        </button>
      </div>

      <ng-template #signingIn>
      <div class="oauth-callback-status">
        <span class="auth-brand-mark">H</span>
        <h1>Signing you in...</h1>
      </div>
      </ng-template>
    </section>
  `
})
export class OAuthCallbackComponent implements OnInit {
  needsRole = false;
  selectedRole: UserRole = 'CANDIDATE';
  provider: OAuthProvider = 'google';
  oauthEmail = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;

    if (params.get('oauthSignup') === 'true') {
      const provider = params.get('provider');
      this.provider = provider === 'github' ? 'github' : 'google';
      this.oauthEmail = params.get('email') || '';
      this.needsRole = true;
      return;
    }

    const token = params.get('token');
    const email = params.get('email');

    if (!token || !email) {
      this.toastService.show('error', 'Social login failed. Please try again.');
      this.router.navigate(['/login']);
      return;
    }

    const role = params.get('role') || 'CANDIDATE';
    this.auth.completeOAuthLogin({
      token,
      name: params.get('name') || '',
      email,
      role,
      userId: Number(params.get('userId'))
    });

    this.toastService.show('success', 'Logged in successfully!');
    this.router.navigate([role === 'EMPLOYER' ? '/my-jobs' : '/jobs']);
  }

  continueSignup() {
    this.auth.startOAuthLogin(this.provider, this.selectedRole);
  }
}
