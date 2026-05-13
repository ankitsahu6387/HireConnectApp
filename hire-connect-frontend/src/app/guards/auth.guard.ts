import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PaymentService } from '../services/payment.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const candidateGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getUser();

  if (authService.isLoggedIn() && user && user.role === 'CANDIDATE') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

export const employerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getUser();

  if (authService.isLoggedIn() && user && user.role === 'EMPLOYER') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

export const analyticsGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const paymentService = inject(PaymentService);
  const user = authService.getUser();

  if (authService.isLoggedIn() && user?.role === 'ADMIN') {
    return true;
  }

  if (authService.isLoggedIn() && user?.role === 'EMPLOYER' && user.userId) {
    return paymentService.getSubscription(user.userId).pipe(
      map((res: any) => {
        const subscription = res?.data;
        const hasPaidPlan = subscription?.status === 'ACTIVE' && subscription?.plan !== 'FREE';
        return hasPaidPlan ? true : router.createUrlTree(['/subscription'], { queryParams: { reason: 'analytics' } });
      }),
      catchError(() => of(router.createUrlTree(['/subscription'], { queryParams: { reason: 'analytics' } })))
    );
  }

  return router.createUrlTree(['/dashboard']);
};
