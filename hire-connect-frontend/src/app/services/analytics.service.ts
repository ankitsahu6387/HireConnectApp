import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PlatformAnalytics {
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  totalInterviews: number;
  premiumUsers: number;
}

export interface JobAnalytics {
  jobId: number;
  title: string;
  status: string;
  viewCount: number;
  applicationCount: number;
  viewToApplyRatio: number;
  averageTimeToHireDays: number | null;
}

export interface RecruiterAnalytics {
  recruiterId: number;
  totalJobs: number;
  totalViews: number;
  totalApplications: number;
  averageViewToApplyRatio: number;
  averageTimeToHireDays: number | null;
  jobs: JobAnalytics[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private baseUrl = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  getPlatformAnalytics(): Observable<PlatformAnalytics> {
    return this.http.get<any>(`${this.baseUrl}/platform`).pipe(map(response => response.data));
  }

  getRecruiterAnalytics(recruiterId: number): Observable<RecruiterAnalytics> {
    return this.http.get<any>(`${this.baseUrl}/recruiter/${recruiterId}`).pipe(map(response => response.data));
  }

  getPlatformAnalyticsFallback(): Observable<PlatformAnalytics> {
    return forkJoin({
      totalUsers: this.countFrom(`${environment.apiUrl}/users/count`),
      totalJobs: this.countFrom(`${environment.apiUrl}/jobs/count`),
      totalApplications: this.countFrom(`${environment.apiUrl}/applications/count`),
      totalInterviews: this.countFrom(`${environment.apiUrl}/interviews/count`),
      premiumUsers: this.countFrom(`${environment.apiUrl}/subscription/premium/count`)
    });
  }

  getRecruiterAnalyticsFallback(recruiterId: number): Observable<RecruiterAnalytics> {
    return this.http.get<any[]>(`${environment.apiUrl}/jobs/employer/${recruiterId}`).pipe(
      switchMap((jobs) => {
        const safeJobs = jobs || [];

        if (safeJobs.length === 0) {
          return of(this.buildRecruiterAnalytics(recruiterId, []));
        }

        return forkJoin(
          safeJobs.map(job =>
            this.http.get<any[]>(`${environment.apiUrl}/applications/job/${job.id}`).pipe(
              map(applications => this.buildJobAnalytics(job, applications || [])),
              catchError(() => of(this.buildJobAnalytics(job, [])))
            )
          )
        ).pipe(
          map(jobReports => this.buildRecruiterAnalytics(recruiterId, jobReports))
        );
      })
    );
  }

  private countFrom(url: string): Observable<number> {
    return this.http.get<number>(url).pipe(catchError(() => of(0)));
  }

  private buildJobAnalytics(job: any, applications: any[]): JobAnalytics {
    const viewCount = Number(job?.viewCount || 0);
    const applicationCount = applications.length;
    const averageTimeToHireDays = this.averageTimeToHire(job, applications);

    return {
      jobId: job.id,
      title: job.title,
      status: job.status || 'OPEN',
      viewCount,
      applicationCount,
      viewToApplyRatio: viewCount === 0 ? 0 : this.round((applicationCount * 100) / viewCount),
      averageTimeToHireDays
    };
  }

  private buildRecruiterAnalytics(recruiterId: number, jobs: JobAnalytics[]): RecruiterAnalytics {
    const totalViews = jobs.reduce((sum, job) => sum + Number(job.viewCount || 0), 0);
    const totalApplications = jobs.reduce((sum, job) => sum + Number(job.applicationCount || 0), 0);
    const averageTimeValues = jobs
      .map(job => job.averageTimeToHireDays)
      .filter((value): value is number => value != null);

    return {
      recruiterId,
      totalJobs: jobs.length,
      totalViews,
      totalApplications,
      averageViewToApplyRatio: totalViews === 0 ? 0 : this.round((totalApplications * 100) / totalViews),
      averageTimeToHireDays: averageTimeValues.length === 0
        ? null
        : this.round(averageTimeValues.reduce((sum, value) => sum + value, 0) / averageTimeValues.length),
      jobs
    };
  }

  private averageTimeToHire(job: any, applications: any[]): number | null {
    if (!job?.postedAt) {
      return null;
    }

    const postedAt = new Date(job.postedAt).getTime();
    const hiredDurations = applications
      .filter(application => ['OFFERED', 'HIRED'].includes(String(application?.status || '').toUpperCase()))
      .map(application => application?.appliedAt ? new Date(application.appliedAt).getTime() : NaN)
      .filter(appliedAt => Number.isFinite(appliedAt) && appliedAt >= postedAt)
      .map(appliedAt => (appliedAt - postedAt) / 86400000);

    if (hiredDurations.length === 0) {
      return null;
    }

    return this.round(hiredDurations.reduce((sum, value) => sum + value, 0) / hiredDurations.length);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
