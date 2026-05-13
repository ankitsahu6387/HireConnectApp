import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login';
import { RegisterComponent } from './components/auth/register/register';
import { PublicDashboardComponent } from './pages/public-dashboard/public-dashboard.component';
import { EmployerDashboardComponent } from './pages/employer-dashboard/employer-dashboard.component';
import { CandidateDashboardComponent } from './pages/candidate-dashboard/candidate-dashboard.component';
import { PostJobComponent } from './pages/post-job/post-job.component';
import { JobDetailComponent } from './pages/job-detail/job-detail.component';
import { SubscriptionComponent } from './pages/subscription/subscription.component';
import { authGuard, analyticsGuard, candidateGuard, employerGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'oauth/callback', loadComponent: () => import('./pages/oauth-callback/oauth-callback.component').then(m => m.OAuthCallbackComponent) },
  { path: 'register', component: RegisterComponent },
  { path: 'signup', component: RegisterComponent },
  { path: 'dashboard', redirectTo: 'jobs', pathMatch: 'full' },
  { path: 'jobs', component: PublicDashboardComponent },
  { path: 'my-jobs', component: EmployerDashboardComponent, canActivate: [authGuard, employerGuard] },
  { path: 'post-job', component: PostJobComponent, canActivate: [authGuard, employerGuard] },
  { path: 'subscription', component: SubscriptionComponent, canActivate: [authGuard, employerGuard] },
  { path: 'analytics', loadComponent: () => import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent), canActivate: [authGuard, analyticsGuard] },
  { path: 'job/:id', component: JobDetailComponent },
  { path: 'my-applications', component: CandidateDashboardComponent, canActivate: [authGuard, candidateGuard] },
  { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent), canActivate: [authGuard] },
  { path: 'profile', loadComponent: () => import('./pages/user-profile/user-profile.component').then(m => m.UserProfileComponent), canActivate: [authGuard] },
  { path: '', redirectTo: 'jobs', pathMatch: 'full' },
  { path: '**', redirectTo: 'jobs' }
];
