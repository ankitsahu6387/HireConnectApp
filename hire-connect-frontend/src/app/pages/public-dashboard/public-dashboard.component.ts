import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';
import { ApplicationService } from '../../services/application.service';

@Component({
  selector: 'app-public-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="surface-hero">
      <div>
        <p class="eyebrow">HireConnect</p>
        <h1>Find roles that match the way you work.</h1>
        <p class="hero-copy">Search open roles, review requirements, and apply with your saved candidate profile.</p>
      </div>
      <div class="hero-actions">
        <a routerLink="/my-applications" class="btn btn-dark">Subscribe now</a>
        <a routerLink="/profile" class="btn btn-light">Edit user profile</a>
      </div>
    </section>

    <section class="toolbar-panel">
      <input [(ngModel)]="filters.keyword" (keyup.enter)="fetchJobs()" placeholder="Search title, skills, or keywords">
      <input [(ngModel)]="filters.location" (keyup.enter)="fetchJobs()" placeholder="Location">
      <select [(ngModel)]="filters.category">
        <option value="">All categories</option>
        <option>Engineering</option>
        <option>Design</option>
        <option>Sales</option>
        <option>Marketing</option>
        <option>Operations</option>
      </select>
      <select [(ngModel)]="filters.type">
        <option value="">Any type</option>
        <option>Full-time</option>
        <option>Part-time</option>
        <option>Contract</option>
        <option>Internship</option>
      </select>
      <button class="btn btn-primary" (click)="fetchJobs()">Search</button>
    </section>

    <div *ngIf="isLoading" class="loading-state">Loading opportunities...</div>

    <section *ngIf="!isLoading && jobs.length === 0" class="empty-state">
      <h2>No matching jobs found</h2>
      <p>Try a broader keyword or clear one of the filters.</p>
    </section>

    <section *ngIf="!isLoading && jobs.length > 0" class="job-grid">
      <article *ngFor="let job of jobs" class="job-card">
        <div class="job-card-header">
          <span class="status-pill">{{ job.status || 'OPEN' }}</span>
          <span>{{ job.postedAt | date:'mediumDate' }}</span>
        </div>
        <h2>{{ job.title }}</h2>
        <p class="muted">{{ job.companyName || 'Company not specified' }} - {{ job.location || 'Remote' }}</p>
        <div class="tag-row">
          <span>{{ job.type || 'Full-time' }}</span>
          <span *ngIf="job.category">{{ job.category }}</span>
          <span>{{ job.location || 'Remote' }}</span>
          <span *ngIf="job.salary">{{ job.salary }}</span>
        </div>
        <p class="description">{{ job.description }}</p>
        <div class="job-card-footer">
          <p><strong>Experience:</strong> {{ job.experienceRequired || 'Open' }}</p>
          <p><strong>Requirements:</strong> {{ job.skills || 'Not specified' }}</p>
        </div>
        <button class="btn btn-primary full" (click)="openJob(job)">
          {{ appliedJobIds.has(job.id) ? 'Applied' : 'View and apply' }}
        </button>
      </article>
    </section>
  `
})
export class PublicDashboardComponent implements OnInit {
  jobs: any[] = [];
  isLoading = true;
  filters = { keyword: '', location: '', category: '', type: '', status: 'OPEN' };
  appliedJobIds = new Set<number>();

  constructor(
    private jobService: JobService,
    private authService: AuthService,
    private applicationService: ApplicationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAppliedJobs();
    this.fetchJobs();
  }

  loadAppliedJobs() {
    const user = this.authService.getUser();
    if (!user?.userId || user.role !== 'CANDIDATE') return;

    this.applicationService.getByUser(user.userId).subscribe({
      next: (applications: any[]) => {
        this.appliedJobIds = new Set((applications || []).map(app => app.jobId));
      },
      error: () => this.appliedJobIds = new Set<number>()
    });
  }

  fetchJobs() {
    this.isLoading = true;
    this.jobService.searchJobs(this.filters).subscribe({
      next: (data) => {
        this.jobs = data;
        this.isLoading = false;
      },
      error: () => {
        this.jobs = [];
        this.isLoading = false;
      }
    });
  }

  openJob(job: any) {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/job', job.id]);
  }
}
