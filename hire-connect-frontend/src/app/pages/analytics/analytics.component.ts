import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalyticsService, PlatformAnalytics, RecruiterAnalytics } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="analytics-page">
      <section class="analytics-header">
        <div>
          <p class="analytics-kicker">{{ isAdmin ? 'Platform report' : 'Recruiter report' }}</p>
          <h1>Analytics</h1>
          <p>{{ isAdmin ? 'Aggregate hiring activity across HireConnect.' : 'Per-job performance for your hiring pipeline.' }}</p>
        </div>
        <a *ngIf="!isAdmin" routerLink="/my-jobs" class="analytics-action">Manage jobs</a>
      </section>

      <div *ngIf="isLoading" class="analytics-loading">
        <div class="analytics-spinner"></div>
      </div>

      <div *ngIf="!isLoading && errorMessage" class="analytics-empty">
        <h2>Analytics unavailable</h2>
        <p>{{ errorMessage }}</p>
      </div>

      <ng-container *ngIf="!isLoading && !errorMessage">
        <section *ngIf="isAdmin && platformAnalytics as platform" class="analytics-grid">
          <article class="metric-card">
            <span>Total users</span>
            <strong>{{ platform.totalUsers || 0 }}</strong>
          </article>
          <article class="metric-card">
            <span>Total jobs</span>
            <strong>{{ platform.totalJobs || 0 }}</strong>
          </article>
          <article class="metric-card">
            <span>Applications</span>
            <strong>{{ platform.totalApplications || 0 }}</strong>
          </article>
          <article class="metric-card">
            <span>Interviews</span>
            <strong>{{ platform.totalInterviews || 0 }}</strong>
          </article>
          <article class="metric-card">
            <span>Premium users</span>
            <strong>{{ platform.premiumUsers || 0 }}</strong>
          </article>
        </section>

        <ng-container *ngIf="!isAdmin && recruiterAnalytics as recruiter">
          <section class="analytics-grid">
            <article class="metric-card">
              <span>Posted jobs</span>
              <strong>{{ recruiter.totalJobs || 0 }}</strong>
            </article>
            <article class="metric-card">
              <span>Views</span>
              <strong>{{ recruiter.totalViews || 0 }}</strong>
            </article>
            <article class="metric-card">
              <span>Applications</span>
              <strong>{{ recruiter.totalApplications || 0 }}</strong>
            </article>
            <article class="metric-card">
              <span>View-to-apply</span>
              <strong>{{ formatPercent(recruiter.averageViewToApplyRatio) }}</strong>
            </article>
            <article class="metric-card">
              <span>Avg. time-to-hire</span>
              <strong>{{ formatDays(recruiter.averageTimeToHireDays) }}</strong>
            </article>
          </section>

          <section class="analytics-table-panel">
            <div class="analytics-table-heading">
              <h2>Job performance</h2>
              <span>{{ recruiter.jobs.length }} jobs</span>
            </div>

            <div *ngIf="recruiter.jobs.length === 0" class="analytics-empty embedded">
              <h2>No jobs yet</h2>
              <p>Post a job to start collecting views, applications, and hiring metrics.</p>
            </div>

            <div *ngIf="recruiter.jobs.length > 0" class="analytics-table-wrap">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Applications</th>
                    <th>View-to-apply</th>
                    <th>Avg. time-to-hire</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let job of recruiter.jobs">
                    <td>
                      <a [routerLink]="['/job', job.jobId]">{{ job.title || 'Untitled job' }}</a>
                    </td>
                    <td>
                      <span class="analytics-status" [class.closed]="job.status === 'CLOSED'">{{ job.status || 'OPEN' }}</span>
                    </td>
                    <td>{{ job.viewCount || 0 }}</td>
                    <td>{{ job.applicationCount || 0 }}</td>
                    <td>{{ formatPercent(job.viewToApplyRatio) }}</td>
                    <td>{{ formatDays(job.averageTimeToHireDays) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </ng-container>
      </ng-container>
    </div>
  `
})
export class AnalyticsComponent implements OnInit {
  isLoading = true;
  isAdmin = false;
  errorMessage = '';
  platformAnalytics: PlatformAnalytics | null = null;
  recruiterAnalytics: RecruiterAnalytics | null = null;

  constructor(
    private analyticsService: AnalyticsService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.getUser();
    this.isAdmin = user?.role === 'ADMIN';

    if (this.isAdmin) {
      this.loadPlatformAnalytics();
      return;
    }

    if (!user?.userId) {
      this.isLoading = false;
      this.errorMessage = 'Sign in as an employer to view recruiter analytics.';
      return;
    }

    this.loadRecruiterAnalytics(user.userId);
  }

  formatPercent(value: number | null | undefined) {
    return `${Number(value || 0).toFixed(1)}%`;
  }

  formatDays(value: number | null | undefined) {
    return value == null ? 'Not available' : `${Number(value).toFixed(1)} days`;
  }

  private loadPlatformAnalytics() {
    this.analyticsService.getPlatformAnalytics().subscribe({
      next: (data) => {
        this.platformAnalytics = data;
        this.isLoading = false;
      },
      error: () => {
        this.analyticsService.getPlatformAnalyticsFallback().subscribe({
          next: (data) => {
            this.platformAnalytics = data;
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'Could not load platform analytics.';
            this.isLoading = false;
          }
        });
      }
    });
  }

  private loadRecruiterAnalytics(recruiterId: number) {
    this.analyticsService.getRecruiterAnalytics(recruiterId).subscribe({
      next: (data) => {
        this.recruiterAnalytics = { ...data, jobs: data.jobs || [] };
        this.isLoading = false;
      },
      error: () => {
        this.analyticsService.getRecruiterAnalyticsFallback(recruiterId).subscribe({
          next: (data) => {
            this.recruiterAnalytics = { ...data, jobs: data.jobs || [] };
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'Could not load recruiter analytics.';
            this.isLoading = false;
          }
        });
      }
    });
  }
}
