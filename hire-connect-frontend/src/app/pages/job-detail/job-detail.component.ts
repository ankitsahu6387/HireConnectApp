import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';
import { ApplicationService } from '../../services/application.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <div *ngIf="!isLoading && job" class="panel">
      <div class="flex justify-between items-start gap-4">
        <div>
          <p class="eyebrow">{{ job.category || 'Open role' }}</p>
          <h1 class="job-detail-title text-3xl font-bold">{{ job.title }}</h1>
          <p class="mt-2 text-sm text-gray-600">{{ job.companyName || 'Company not specified' }} - {{ job.location || 'Remote' }}</p>
          <div class="tag-row mt-4">
            <span>{{ job.type || 'Full-time' }}</span>
            <span *ngIf="job.category">{{ job.category }}</span>
            <span>{{ job.location || 'Remote' }}</span>
            <span *ngIf="job.salary">{{ job.salary }}</span>
          </div>
        </div>
        <div *ngIf="isCandidate()">
          <button (click)="apply()" [disabled]="isApplying || hasApplied" class="btn btn-primary">
            {{ hasApplied ? 'Applied' : isApplying ? 'Applying...' : 'Apply Now' }}
          </button>
        </div>
      </div>
      <div class="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <h2 class="section-title">Job description</h2>
          <p class="mt-3 text-sm leading-7 text-gray-700 whitespace-pre-line">{{ job.description }}</p>
          <div class="job-detail-requirements">
            <p><strong>Experience:</strong> {{ job.experienceRequired || 'Open' }}</p>
            <h3>Requirements</h3>
            <p>{{ job.skills || 'Not specified' }}</p>
          </div>
        </div>
        <aside class="summary-box">
          <h2>Role details</h2>
          <p><strong>Company:</strong> {{ job.companyName || 'Not specified' }}</p>
          <p><strong>Category:</strong> {{ job.category || 'Not specified' }}</p>
          <p><strong>Experience:</strong> {{ job.experienceRequired || 'Open' }}</p>
          <p><strong>Status:</strong> {{ job.status || 'OPEN' }}</p>
        </aside>
      </div>
    </div>
    
    <div *ngIf="applySuccess" class="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
      <div class="flex">
        <div class="ml-3">
          <p class="text-sm text-green-700">
            Successfully applied for this job!
          </p>
        </div>
      </div>
    </div>
    <div *ngIf="applyError" class="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
      <div class="flex">
        <div class="ml-3">
          <p class="text-sm text-red-700">
            {{ applyError }}
          </p>
        </div>
      </div>
    </div>
  `
})
export class JobDetailComponent implements OnInit {
  job: any;
  isLoading = true;
  isApplying = false;
  applySuccess = false;
  applyError = '';
  hasApplied = false;

  constructor(
    private route: ActivatedRoute,
    private jobService: JobService,
    public authService: AuthService,
    private applicationService: ApplicationService,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const user = this.authService.getUser();
      const candidateUserId = user?.role === 'CANDIDATE' ? user.userId : undefined;
      this.jobService.getJobById(+id, candidateUserId).subscribe({
        next: (data) => {
          this.job = data;
          this.isLoading = false;
          this.checkApplicationState(+id);
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        }
      });
    }
  }

  isCandidate() {
    return this.authService.isLoggedIn() && this.authService.getUser()?.role === 'CANDIDATE';
  }

  checkApplicationState(jobId: number) {
    const user = this.authService.getUser();
    if (!user?.userId || user.role !== 'CANDIDATE') return;

    this.applicationService.hasApplied(user.userId, jobId).pipe(
      catchError(() => of(null))
    ).subscribe((application) => {
      this.hasApplied = !!application;
    });
  }

  apply() {
    if (this.hasApplied) return;

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    
    const user = this.authService.getUser();
    if (user.role !== 'CANDIDATE') return;

    this.isApplying = true;
    this.applySuccess = false;
    this.applyError = '';

    const payload = {
      jobId: this.job.id,
      userId: user.userId,
      resumeLink: user.resume || '',
      coverLetter: 'Applied from HireConnect candidate dashboard.'
    };

    this.applicationService.applyJob(payload).subscribe({
      next: (res) => {
        this.isApplying = false;
        this.applySuccess = true;
        this.hasApplied = true;
      },
      error: (err) => {
        this.isApplying = false;
        this.applyError = err.error?.message || 'Failed to apply. You might have already applied.';
      }
    });
  }
}
