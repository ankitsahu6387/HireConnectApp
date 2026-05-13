import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job.service';
import { ApplicationService } from '../../services/application.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { InterviewService } from '../../services/interview.service';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

@Component({
  selector: 'app-employer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center bg-white px-4 py-5 border-b border-gray-200 sm:px-6 shadow sm:rounded-lg">
        <div>
          <h3 class="text-lg leading-6 font-medium text-gray-900">My Posted Jobs</h3>
          <p class="mt-1 text-sm text-gray-500">Manage your job postings and applicants.</p>
        </div>
        <div>
          <a routerLink="/post-job" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
            Post New Job
          </a>
        </div>
      </div>

      <div *ngIf="isLoading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>

      <div *ngIf="!isLoading && jobs.length === 0" class="text-center py-12 bg-white shadow sm:rounded-lg">
        <p class="text-sm text-gray-500">You haven't posted any jobs yet.</p>
      </div>

      <div class="bg-white shadow overflow-hidden sm:rounded-md" *ngIf="jobs.length > 0">
        <ul role="list" class="divide-y divide-gray-200">
          <li *ngFor="let job of jobs">
            <div class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4">
              <div>
                <div class="flex items-center gap-3 flex-wrap">
                  <p class="text-sm font-medium text-primary-600 truncate">{{ job.title }}</p>
                  <span class="job-status-pill" [ngClass]="isJobClosed(job) ? 'closed' : 'active'">
                    {{ isJobClosed(job) ? 'Closed' : 'Active' }}
                  </span>
                </div>
                <div class="mt-2 sm:flex sm:justify-between">
                  <div class="sm:flex">
                    <p class="flex items-center text-sm text-gray-500">
                      {{ job.location || 'Remote' }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex space-x-2">
                <button (click)="openEditForm(job)" class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  Edit Details
                </button>
                <button (click)="viewApplicants(job)" class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  View Applicants
                </button>
                <button (click)="toggleJobStatus(job)" [disabled]="statusUpdatingJobId === job.id"
                  class="inline-flex items-center px-3 py-1.5 border shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2"
                  [ngClass]="isJobClosed(job) ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'">
                  {{ statusUpdatingJobId === job.id ? 'Saving...' : isJobClosed(job) ? 'Open Applications' : 'Close Applications' }}
                </button>
                <button (click)="deleteJob(job)" [disabled]="deletingJobId === job.id"
                  class="inline-flex items-center px-3 py-1.5 border border-red-200 shadow-sm text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  {{ deletingJobId === job.id ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </div>

            <form *ngIf="editingJobId === job.id" (ngSubmit)="saveJobDetails(job)" class="bg-white px-4 py-5 sm:px-6 border-t border-gray-200 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase">Title</label>
                <input name="editTitle{{ job.id }}" [(ngModel)]="editForm.title" required class="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase">Company</label>
                <input name="editCompany{{ job.id }}" [(ngModel)]="editForm.companyName" required class="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase">Category</label>
                <select name="editCategory{{ job.id }}" [(ngModel)]="editForm.category" class="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option>Engineering</option>
                  <option>Design</option>
                  <option>Sales</option>
                  <option>Marketing</option>
                  <option>Operations</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase">Type</label>
                <select name="editType{{ job.id }}" [(ngModel)]="editForm.type" class="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Internship</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase">Location</label>
                <input name="editLocation{{ job.id }}" [(ngModel)]="editForm.location" class="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase">Salary</label>
                <input name="editSalary{{ job.id }}" [(ngModel)]="editForm.salary" class="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase">Description</label>
                <textarea name="editDescription{{ job.id }}" [(ngModel)]="editForm.description" required rows="3" class="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"></textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase">Experience</label>
                <input name="editExperience{{ job.id }}" [(ngModel)]="editForm.experienceRequired" class="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase">Requirements</label>
                <input name="editSkills{{ job.id }}" [(ngModel)]="editForm.skills" class="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div class="sm:col-span-2 flex justify-end gap-2">
                <button type="button" (click)="editingJobId = null" class="text-xs bg-white text-gray-700 px-3 py-1.5 rounded border border-gray-300">Cancel</button>
                <button type="submit" [disabled]="savingJobId === job.id" class="text-xs bg-primary-600 text-white px-3 py-1.5 rounded hover:bg-primary-700">
                  {{ savingJobId === job.id ? 'Saving...' : 'Save Details' }}
                </button>
              </div>
            </form>
            
            <!-- Applicants Section (Hidden until toggled) -->
            <div *ngIf="selectedJobId === job.id" class="bg-gray-50 px-4 py-5 sm:px-6 border-t border-gray-200">
              <h4 class="text-sm font-medium text-gray-900 mb-4">Applicants for {{ job.title }}</h4>
              
              <div *ngIf="isLoadingApplicants" class="text-sm text-gray-500">Loading applicants...</div>
              
              <div *ngIf="!isLoadingApplicants && applicants.length === 0" class="text-sm text-gray-500">
                No applicants yet.
              </div>

              <ul *ngIf="applicants.length > 0" class="divide-y divide-gray-200 bg-white shadow rounded-md">
                <li *ngFor="let app of applicants" class="p-4">
                  <div class="flex justify-between items-start gap-4">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ app.candidateName }}</p>
                    <p class="text-xs text-gray-500">{{ app.candidateEmail }}</p>
                    <p class="text-xs mt-1">
                      <a *ngIf="app.resumeLink" [href]="app.resumeLink" target="_blank" rel="noreferrer" class="text-primary-600 font-semibold hover:underline">
                        View resume
                      </a>
                      <span *ngIf="!app.resumeLink" class="text-gray-500">Resume not provided</span>
                    </p>
                    <p class="text-xs text-gray-500 mt-1">Status: <span class="font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{{ app.status }}</span></p>
                    <p *ngIf="app.interview" class="text-xs text-gray-500 mt-1">
                      Interview: <span class="font-semibold">{{ app.interview.status }}</span> · {{ formatDateTime(app.interview.interviewDate) }} · {{ app.interview.mode }}
                    </p>
                  </div>
                  <div class="flex space-x-2">
                    <button (click)="updateStatus(app.id, 'SHORTLISTED')" class="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 border border-green-200">Shortlist</button>
                    <button (click)="openScheduleForm(app)" class="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 border border-indigo-200">Interview</button>
                    <button (click)="updateStatus(app.id, 'OFFERED')" class="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded hover:bg-amber-100 border border-amber-200">Offer</button>
                    <button (click)="updateStatus(app.id, 'REJECTED')" class="text-xs bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100 border border-red-200">Reject</button>
                  </div>
                  </div>
                  <div *ngIf="app.interview?.status === 'RESCHEDULE_REQUESTED'" class="reschedule-request-panel">
                    <div class="reschedule-request-heading">
                      <div>
                        <p class="eyebrow">Reschedule request</p>
                        <h5>{{ app.candidateName }}</h5>
                      </div>
                      <span>Pending review</span>
                    </div>
                    <div class="reschedule-request-grid">
                      <div>
                        <span>Current interview</span>
                        <strong>{{ formatDateTime(app.interview.interviewDate, 'Not set') }}</strong>
                      </div>
                      <div>
                        <span>Requested time</span>
                        <strong>{{ formatDateTime(app.interview.requestedInterviewDate, 'No time provided') }}</strong>
                      </div>
                      <div class="reason">
                        <span>Reason</span>
                        <strong>{{ app.interview.rescheduleReason || 'No reason provided' }}</strong>
                      </div>
                    </div>
                    <div class="mt-4 flex justify-end">
                      <button type="button" (click)="openRescheduleForm(app)" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700">
                        Reschedule Interview
                      </button>
                    </div>
                  </div>
                  <form *ngIf="schedulingApplicationId === app.id" (ngSubmit)="scheduleInterview(app)" class="mt-4 grid gap-3 sm:grid-cols-2 bg-gray-50 border border-gray-200 rounded p-3">
                    <input name="interviewDate" [(ngModel)]="scheduleForm.interviewDate" type="datetime-local" [min]="minDateTime" required class="border border-gray-300 rounded px-3 py-2 text-sm" />
                    <select name="mode" [(ngModel)]="scheduleForm.mode" class="border border-gray-300 rounded px-3 py-2 text-sm">
                      <option value="ONLINE">Online</option>
                      <option value="IN_PERSON">In-Person</option>
                    </select>
                    <input name="meetingLink" [(ngModel)]="scheduleForm.meetingLink" placeholder="Meeting link" class="border border-gray-300 rounded px-3 py-2 text-sm" />
                    <input name="location" [(ngModel)]="scheduleForm.location" placeholder="Location" class="border border-gray-300 rounded px-3 py-2 text-sm" />
                    <textarea name="notes" [(ngModel)]="scheduleForm.notes" placeholder="Notes for candidate" class="sm:col-span-2 border border-gray-300 rounded px-3 py-2 text-sm"></textarea>
                    <div class="sm:col-span-2 flex gap-2 justify-end">
                      <button type="button" (click)="schedulingApplicationId = null" class="text-xs bg-white text-gray-700 px-3 py-1.5 rounded border border-gray-300">Cancel</button>
                      <button type="submit" [disabled]="isScheduling" class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700">
                        {{ isScheduling ? 'Saving...' : 'Schedule Interview' }}
                      </button>
                    </div>
                  </form>
                </li>
              </ul>
            </div>

          </li>
        </ul>
      </div>
    </div>
  `
})
export class EmployerDashboardComponent implements OnInit {
  jobs: any[] = [];
  isLoading = true;
  
  selectedJobId: number | null = null;
  applicants: any[] = [];
  isLoadingApplicants = false;
  statusUpdatingJobId: number | null = null;
  editingJobId: number | null = null;
  savingJobId: number | null = null;
  deletingJobId: number | null = null;
  schedulingApplicationId: number | null = null;
  isScheduling = false;
  minDateTime = this.getMinDateTime();
  scheduleForm = this.emptyScheduleForm();
  editForm: any = {};

  constructor(
    private jobService: JobService,
    private applicationService: ApplicationService,
    private authService: AuthService,
    private userService: UserService,
    private interviewService: InterviewService
  ) {}

  ngOnInit() {
    this.fetchMyJobs();
  }

  fetchMyJobs() {
    const user = this.authService.getUser();
    if (!user || !user.userId) return;

    this.jobService.getJobsByEmployer(user.userId).subscribe({
      next: (data) => {
        this.jobs = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  viewApplicants(job: any) {
    if (this.selectedJobId === job.id) {
      this.selectedJobId = null; // Toggle off
      return;
    }

    this.editingJobId = null;
    this.selectedJobId = job.id;
    this.isLoadingApplicants = true;
    this.applicants = [];

    this.applicationService.getByJob(job.id).subscribe({
      next: (data) => {
        this.enrichApplicants(data);
      },
      error: (err) => {
        console.error('Failed to load applicants', err);
        this.isLoadingApplicants = false;
      }
    });
  }

  enrichApplicants(applications: any[]) {
    if (!applications.length) {
      this.applicants = [];
      this.isLoadingApplicants = false;
      return;
    }

    forkJoin(applications.map(app =>
      forkJoin({
        user: this.userService.getUserById(app.userId).pipe(catchError(() => of(null))),
        interviews: this.interviewService.getByApplication(app.id).pipe(catchError(() => of([])))
      }).pipe(
        map(({ user, interviews }: any) => ({
          ...app,
          candidateName: user?.name || `Candidate ${app.userId}`,
          candidateEmail: user?.email || '',
          resumeLink: user?.resume || app.resumeLink || '',
          interview: interviews?.[0] || null
        }))
      )
    )).subscribe({
      next: (enrichedApplicants) => {
        this.applicants = enrichedApplicants;
        this.isLoadingApplicants = false;
      },
      error: () => {
        this.applicants = applications;
        this.isLoadingApplicants = false;
      }
    });
  }

  updateStatus(applicationId: number, status: string) {
    this.applicationService.updateStatus(applicationId, status).subscribe({
      next: (data) => {
        // Update local status
        const app = this.applicants.find(a => a.id === applicationId);
        if (app) app.status = status;
      },
      error: (err) => {
        alert('Failed to update status');
      }
    });
  }

  openScheduleForm(app: any) {
    this.refreshMinDateTime();
    this.schedulingApplicationId = app.id;
    this.scheduleForm = {
      interviewDate: this.isFutureDateTime(app.interview?.interviewDate) ? app.interview.interviewDate : '',
      mode: app.interview?.mode || 'ONLINE',
      meetingLink: app.interview?.meetingLink || '',
      location: app.interview?.location || '',
      notes: app.interview?.notes || ''
    };
  }

  openRescheduleForm(app: any) {
    this.refreshMinDateTime();
    this.schedulingApplicationId = app.id;
    this.scheduleForm = {
      interviewDate: this.isFutureDateTime(app.interview?.requestedInterviewDate)
        ? app.interview.requestedInterviewDate
        : '',
      mode: app.interview?.mode || 'ONLINE',
      meetingLink: app.interview?.meetingLink || '',
      location: app.interview?.location || '',
      notes: app.interview?.notes || ''
    };
  }

  scheduleInterview(app: any) {
    const user = this.authService.getUser();
    if (!user?.userId) return;

    this.refreshMinDateTime();
    if (!this.isFutureDateTime(this.scheduleForm.interviewDate)) {
      alert('Please select a future date and time for the interview.');
      return;
    }

    this.isScheduling = true;
    this.interviewService.scheduleInterview({
      applicationId: app.id,
      jobId: app.jobId,
      userId: app.userId,
      recruiterId: user.userId,
      ...this.scheduleForm
    }).subscribe({
      next: (interview) => {
        app.interview = interview;
        app.status = 'INTERVIEW_SCHEDULED';
        this.schedulingApplicationId = null;
        this.isScheduling = false;
        this.updateStatus(app.id, 'INTERVIEW_SCHEDULED');
      },
      error: () => {
        this.isScheduling = false;
        alert('Failed to schedule interview');
      }
    });
  }

  emptyScheduleForm() {
    return {
      interviewDate: '',
      mode: 'ONLINE',
      meetingLink: '',
      location: '',
      notes: ''
    };
  }

  getMinDateTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 1);
    return now.toISOString().slice(0, 16);
  }

  refreshMinDateTime() {
    this.minDateTime = this.getMinDateTime();
  }

  isFutureDateTime(value: string) {
    return !!value && new Date(value).getTime() > Date.now();
  }

  formatDateTime(value: string, fallback = 'Not set') {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `On ${day}/${month}/${year} At ${time}`;
  }

  isJobClosed(job: any) {
    return job.status === 'CLOSED';
  }

  openEditForm(job: any) {
    const shouldOpenEditForm = this.editingJobId !== job.id;
    this.editingJobId = shouldOpenEditForm ? job.id : null;

    if (!shouldOpenEditForm) {
      return;
    }

    this.selectedJobId = null;
    this.schedulingApplicationId = null;
    this.editForm = {
      title: job.title || '',
      companyName: job.companyName || '',
      category: job.category || 'Engineering',
      type: job.type || 'Full-time',
      description: job.description || '',
      location: job.location || '',
      salary: job.salary || '',
      skills: job.skills || '',
      experienceRequired: job.experienceRequired || '',
      status: job.status || 'OPEN'
    };
  }

  saveJobDetails(job: any) {
    const user = this.authService.getUser();
    if (!user?.userId) return;

    this.savingJobId = job.id;
    const payload = {
      ...job,
      ...this.editForm,
      employerId: user.userId,
      role: user.role
    };

    this.jobService.updateJob(job.id, payload).subscribe({
      next: (updatedJob) => {
        Object.assign(job, updatedJob);
        this.editingJobId = null;
        this.savingJobId = null;
      },
      error: () => {
        this.savingJobId = null;
        alert('Failed to update job details');
      }
    });
  }

  deleteJob(job: any) {
    const user = this.authService.getUser();
    if (!user?.userId) return;
    if (!confirm(`Delete "${job.title}"? This cannot be undone.`)) return;

    this.deletingJobId = job.id;
    this.jobService.deleteJob(job.id, user.userId).subscribe({
      next: () => {
        this.jobs = this.jobs.filter(item => item.id !== job.id);
        if (this.selectedJobId === job.id) this.selectedJobId = null;
        if (this.editingJobId === job.id) this.editingJobId = null;
        this.deletingJobId = null;
      },
      error: () => {
        this.deletingJobId = null;
        alert('Failed to delete job');
      }
    });
  }

  toggleJobStatus(job: any) {
    const user = this.authService.getUser();
    if (!user?.userId) return;

    this.statusUpdatingJobId = job.id;
    const nextStatus = this.isJobClosed(job) ? 'OPEN' : 'CLOSED';
    const payload = {
      ...job,
      employerId: user.userId,
      role: user.role,
      status: nextStatus
    };

    this.jobService.updateJob(job.id, payload).subscribe({
      next: (updatedJob) => {
        Object.assign(job, updatedJob);
        this.statusUpdatingJobId = null;
      },
      error: () => {
        this.statusUpdatingJobId = null;
        alert('Failed to update job status');
      }
    });
  }
}
