import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6">
      <div class="page-heading">
        <p class="eyebrow">Recruiter workspace</p>
        <h1>Post a new role</h1>
        <p>Publish a clear job listing candidates can search, review, and apply to.</p>
      </div>

      <div class="panel">
        <form [formGroup]="jobForm" (ngSubmit)="onSubmit()" class="space-y-6">
          
          <div *ngIf="errorMessage" class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Job Title</label>
            <div class="mt-1">
              <input formControlName="title" type="text" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Company Name</label>
            <div class="mt-1">
              <input formControlName="companyName" type="text" required placeholder="Acme Technologies" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
            </div>
          </div>

          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-gray-700">Category</label>
            <div class="mt-1">
              <select formControlName="category" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                <option>Engineering</option>
                <option>Design</option>
                <option>Sales</option>
                <option>Marketing</option>
                <option>Operations</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Job Type</label>
            <div class="mt-1">
              <select formControlName="type" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Internship</option>
              </select>
            </div>
          </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Description</label>
            <div class="mt-1">
              <textarea formControlName="description" rows="4" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"></textarea>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Requirements</label>
            <div class="mt-1">
              <textarea formControlName="skills" rows="3" required placeholder="Java, Spring Boot, Angular" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"></textarea>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Experience Required</label>
            <div class="mt-1">
              <input formControlName="experienceRequired" type="text" required placeholder="2-4 years" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Salary</label>
            <div class="mt-1">
              <input formControlName="salary" type="text" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Location</label>
            <div class="mt-1">
              <input formControlName="location" type="text" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button type="button" (click)="cancel()" class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              Cancel
            </button>
            <button type="submit" [disabled]="isLoading" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50">
              {{ isLoading ? 'Posting...' : 'Post Job' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class PostJobComponent {
  jobForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  private readonly requiredText = [Validators.required, Validators.pattern(/\S/)];

  constructor(
    private fb: FormBuilder,
    private jobService: JobService,
    private authService: AuthService,
    private router: Router
  ) {
    this.jobForm = this.fb.group({
      title: ['', this.requiredText],
      companyName: ['', this.requiredText],
      category: ['Engineering', Validators.required],
      type: ['Full-time', Validators.required],
      description: ['', this.requiredText],
      skills: ['', this.requiredText],
      experienceRequired: ['', this.requiredText],
      salary: ['', this.requiredText],
      location: ['', this.requiredText]
    });
  }

  onSubmit() {
    if (this.jobForm.invalid) {
      this.jobForm.markAllAsTouched();
      this.errorMessage = 'Please fill in all fields before posting the job.';
      return;
    }

    const user = this.authService.getUser();
    if (!user || !user.userId) return;

    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      ...this.jobForm.value,
      employerId: user.userId,
      role: user.role,
      status: 'OPEN'
    };

    this.jobService.postJob(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/my-jobs']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to post job.';
      }
    });
  }

  cancel() {
    this.router.navigate(['/my-jobs']);
  }
}
