import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6 mt-10">
      <div class="bg-white px-4 py-5 border-b border-gray-200 sm:px-6 shadow sm:rounded-lg">
        <h3 class="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
        <p class="mt-1 text-sm text-gray-500">{{ isEmployer ? 'Manage your employer profile and company information.' : 'Manage your personal information and resume.' }}</p>
      </div>

      <div *ngIf="isLoading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>

      <div *ngIf="!isLoading" class="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
        
        <div *ngIf="toastMessage" [ngClass]="toastType === 'success' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-700'" class="border-l-4 p-4 mb-6 transition-all">
          <p class="text-sm">{{ toastMessage }}</p>
        </div>

        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            
            <div class="sm:col-span-1">
              <label class="block text-sm font-medium text-gray-700">Full Name</label>
              <div class="mt-1">
                <input formControlName="name" type="text" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              </div>
            </div>

            <div class="sm:col-span-1">
              <label class="block text-sm font-medium text-gray-700">Email Address (Read-Only)</label>
              <div class="mt-1">
                <input formControlName="email" type="email" readonly class="bg-gray-50 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-500">
              </div>
            </div>

            <div class="sm:col-span-2" *ngIf="!isEmployer">
              <label class="block text-sm font-medium text-gray-700">Skills</label>
              <div class="mt-1">
                <input formControlName="skills" type="text" placeholder="e.g., Java, Angular, Spring Boot" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              </div>
            </div>

            <div class="sm:col-span-1">
              <label class="block text-sm font-medium text-gray-700">Experience</label>
              <div class="mt-1">
                <input formControlName="experience" type="text" placeholder="e.g., 3 years" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              </div>
            </div>

            <div class="sm:col-span-1">
              <label class="block text-sm font-medium text-gray-700">Company</label>
              <div class="mt-1">
                <input formControlName="company" type="text" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              </div>
            </div>

            <div class="sm:col-span-2" *ngIf="!isEmployer">
              <label class="block text-sm font-medium text-gray-700">Resume Link (Optional)</label>
              <div class="mt-1">
                <input formControlName="resume" type="url" placeholder="https://drive.google.com/..." class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
              </div>
            </div>
            
          </div>

          <div class="flex justify-end">
            <button type="submit" [disabled]="isSaving" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50">
              {{ isSaving ? 'Saving...' : 'Save Profile' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class UserProfileComponent implements OnInit {
  profileForm: FormGroup;
  isLoading = true;
  isSaving = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  isEmployer = false;

  private apiUrl = `${environment.apiUrl}/users`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: [''],
      role: [''],
      skills: [''],
      experience: [''],
      company: [''],
      resume: ['']
    });
  }

  ngOnInit() {
    this.fetchProfile();
  }

  fetchProfile() {
    const user = this.authService.getUser();
    if (!user || !user.userId) {
      this.router.navigate(['/login']);
      return;
    }
    this.isEmployer = user.role === 'EMPLOYER';

    this.http.get(`${this.apiUrl}/profile/${user.userId}`).subscribe({
      next: (data: any) => {
        this.applyProfileData(data, user);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load profile', err);
        if (err.status === 404) {
          this.createMissingProfile(user);
          return;
        }

        this.showToast('error', 'Failed to load profile data.');
        this.isLoading = false;
      }
    });
  }

  private createMissingProfile(user: any) {
    const payload = {
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'CANDIDATE',
      skills: '',
      experience: '',
      company: '',
      resume: ''
    };

    this.http.post(`${this.apiUrl}/${user.userId}`, payload).subscribe({
      next: (data: any) => {
        this.applyProfileData(data, user);
        this.showToast('success', 'Profile created successfully.');
        this.isLoading = false;
      },
      error: (createErr) => {
        console.error('Failed to create missing profile', createErr);
        this.showToast('error', 'Failed to load profile data.');
        this.isLoading = false;
      }
    });
  }

  private applyProfileData(data: any, authUser: any) {
    const profile = {
      name: data?.name || authUser?.name || '',
      email: data?.email || authUser?.email || '',
      role: data?.role || authUser?.role || 'CANDIDATE',
      skills: data?.skills || '',
      experience: data?.experience || '',
      company: data?.company || '',
      resume: data?.resume || ''
    };

    this.isEmployer = profile.role === 'EMPLOYER';
    this.profileForm.patchValue(profile);
  }

  onSubmit() {
    if (this.profileForm.invalid) return;

    this.isSaving = true;
    const user = this.authService.getUser();
    const payload = { ...this.profileForm.value };
    if (this.isEmployer) {
      delete payload.skills;
      delete payload.resume;
    }

    this.http.put(`${this.apiUrl}/profile/update/${user.userId}`, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.showToast('success', 'Profile updated successfully!');
      },
      error: (err) => {
        console.error('Failed to update profile', err);
        this.isSaving = false;
        this.showToast('error', 'Failed to update profile.');
      }
    });
  }

  showToast(type: 'success' | 'error', message: string) {
    this.toastType = type;
    this.toastMessage = message;
    setTimeout(() => this.toastMessage = '', 4000);
  }
}
