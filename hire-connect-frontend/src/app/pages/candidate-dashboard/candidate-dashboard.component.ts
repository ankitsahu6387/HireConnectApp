import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ApplicationService } from '../../services/application.service';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';
import { InterviewService } from '../../services/interview.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-candidate-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="dashboard-heading">
        <div>
          <p class="eyebrow">Candidate dashboard</p>
          <h3>My Applications</h3>
          <p>Track your submitted applications and current hiring status.</p>
        </div>
        <a routerLink="/jobs" class="btn btn-primary">Find More Jobs</a>
      </div>

      <div *ngIf="isLoading" class="loading-state">Loading applications...</div>

      <div *ngIf="!isLoading && applications.length === 0" class="empty-state">
        <h3>No applications found</h3>
        <p>You have not applied to any jobs yet.</p>
      </div>

      <div class="candidate-applications-grid" *ngIf="applications.length > 0">
        <article *ngFor="let app of applications" class="candidate-application-card" [class.expanded]="selectedApplicationId === app.id">
          <div class="candidate-application-main">
            <div>
              <p class="eyebrow">Application</p>
              <h4>{{ app.jobTitle }}</h4>
              <p class="application-location">{{ app.jobLocation || 'Remote' }}</p>
            </div>
            <span *ngIf="hasSubscription" class="application-status" [ngClass]="statusClass(app.status)">{{ app.status }}</span>
            <span *ngIf="!hasSubscription" class="application-status locked">Premium</span>
          </div>
          <div class="candidate-application-meta">
            <span>Applied</span>
            <strong>{{ app.appliedAt | date:'mediumDate' }}</strong>
          </div>
          <div class="candidate-application-actions">
            <button type="button" (click)="openApplicationDetails(app)" class="btn btn-secondary full">
              {{ hasSubscription ? selectedApplicationId === app.id ? 'Hide details' : 'View full details' : 'Check application status' }}
            </button>
          </div>

          <div *ngIf="selectedApplicationId === app.id && !hasSubscription" class="application-upgrade-notice">
            <strong>Subscription required</strong>
            <p>Activate Candidate Premium to check application status, view interview details, and request interview rescheduling.</p>
          </div>

          <div *ngIf="selectedApplicationId === app.id && hasSubscription" class="application-detail-panel">
            <div class="detail-grid">
              <div>
                <span>Current status</span>
                <strong>{{ app.status }}</strong>
              </div>
              <div>
                <span>Applied on</span>
                <strong>{{ app.appliedAt | date:'medium' }}</strong>
              </div>
              <div>
                <span>Location</span>
                <strong>{{ app.jobLocation || 'Remote' }}</strong>
              </div>
              <div>
                <span>Company</span>
                <strong>{{ app.companyName || 'Not specified' }}</strong>
              </div>
              <div>
                <span>Employer email</span>
                <strong>{{ app.employerEmail || 'Not available' }}</strong>
              </div>
            </div>
            <div *ngIf="!interviewsByApplication[app.id]" class="interview-empty-note">
              No interview has been scheduled yet.
            </div>
          </div>

          <div *ngIf="selectedApplicationId === app.id && hasSubscription && interviewsByApplication[app.id] as interview" class="mt-4 rounded border border-gray-200 bg-gray-50 p-4">
            <div class="flex justify-between gap-3 flex-wrap">
              <div>
                <p class="eyebrow">Interview</p>
                <h4>{{ formatDateTime(interview.interviewDate) }}</h4>
                <p class="text-sm text-gray-600">{{ interview.mode }} <span *ngIf="interview.location">· {{ interview.location }}</span></p>
                <a *ngIf="interview.meetingLink" [href]="interview.meetingLink" target="_blank" rel="noreferrer" class="text-sm text-primary-600 hover:underline">Join meeting</a>
                <p *ngIf="interview.notes" class="text-sm text-gray-600 mt-2">{{ interview.notes }}</p>
              </div>
              <span class="application-status" [ngClass]="interviewStatusClass(interview.status)">{{ interview.status }}</span>
            </div>
            <div class="flex gap-2 mt-3 flex-wrap" *ngIf="interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED' || interview.status === 'CONFIRMED'">
              <button (click)="confirmInterview(interview)" [disabled]="interview.status === 'CONFIRMED'" class="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded border border-green-200">
                Confirm
              </button>
              <button (click)="toggleReschedule(interview)" class="text-xs bg-white text-gray-700 px-3 py-1.5 rounded border border-gray-300">
                Request reschedule
              </button>
            </div>
            <form *ngIf="reschedulingInterviewId === interview.id" (ngSubmit)="requestReschedule(interview)" class="mt-3 grid gap-2">
              <div class="candidate-reschedule-panel">
                <div class="reschedule-request-heading">
                  <div>
                    <p class="eyebrow">Reschedule request</p>
                    <h5>Request a new interview time</h5>
                  </div>
                </div>
                <div class="reschedule-request-grid">
                  <div>
                    <span>Current interview</span>
                    <strong>{{ formatDateTime(interview.interviewDate, 'Not set') }}</strong>
                  </div>
                  <div>
                    <span>Requested time</span>
                    <input name="requestedInterviewDate{{ interview.id }}" [(ngModel)]="rescheduleForm.requestedInterviewDate" type="datetime-local" [min]="minDateTime" required class="border border-gray-300 rounded px-3 py-2 text-sm" />
                  </div>
                  <div class="reason">
                    <span>Reason</span>
                    <textarea name="reason{{ interview.id }}" [(ngModel)]="rescheduleForm.reason" placeholder="Tell the recruiter in short why you need a new time" class="min-h-20 border border-gray-300 rounded px-3 py-2 text-sm"></textarea>
                  </div>
                </div>
                <button type="submit" [disabled]="isRescheduling" class="mt-3 text-xs bg-primary-600 text-white px-3 py-1.5 rounded">
                  {{ isRescheduling ? 'Sending...' : 'Send request' }}
                </button>
              </div>
            </form>
          </div>
        </article>
      </div>

      <div *ngIf="message" class="subscription-message" [ngClass]="messageType">
        {{ message }}
      </div>

      <div *ngIf="paymentCompleted" class="payment-complete-panel">
        <div>
          <p class="eyebrow">Payment complete</p>
          <h2>Candidate Premium is active</h2>
          <p>Your dashboard has been updated with premium status alerts.</p>
        </div>
        <div class="payment-complete-meta">
          <span>ACTIVE</span>
          <strong>PROFESSIONAL</strong>
        </div>
      </div>

      <section class="candidate-subscription-panel" [class.active]="hasSubscription">
        <div>
          <p class="eyebrow">Candidate premium</p>
          <h3>{{ hasSubscription ? 'Premium Member' : 'Subscribe now' }}</h3>
          <p>{{ hasSubscription ? 'You are receiving priority application and interview updates.' : 'Get priority status updates, notifications, and interview scheduling alerts just for Rs 99 per month.' }}</p>
        </div>
        <button *ngIf="!hasSubscription" (click)="subscribe()" [disabled]="isSubscribing" class="btn btn-dark">
          {{ isSubscribing ? checkoutStage || 'Processing...' : 'Subscribe now - Rs 99' }}
        </button>
      </section>

      <div *ngIf="showDummyCheckout" class="checkout-backdrop">
        <div class="checkout-modal">
          <div class="checkout-loader"></div>
          <p class="eyebrow">Test checkout</p>
          <h2>{{ checkoutStage }}</h2>
          <p>This fallback simulates the Razorpay test payment animation when the checkout script cannot load.</p>
        </div>
      </div>
    </div>
  `
})
export class CandidateDashboardComponent implements OnInit {
  applications: any[] = [];
  interviewsByApplication: Record<number, any> = {};
  selectedApplicationId: number | null = null;
  isLoading = true;
  hasSubscription = false;
  isSubscribing = false;
  checkoutStage = '';
  showDummyCheckout = false;
  paymentCompleted = false;
  message = '';
  messageType: 'success' | 'error' = 'success';
  razorpayKey = '';
  reschedulingInterviewId: number | null = null;
  isRescheduling = false;
  minDateTime = this.getMinDateTime();
  rescheduleForm = {
    requestedInterviewDate: '',
    reason: ''
  };

  constructor(
    private applicationService: ApplicationService,
    private jobService: JobService,
    private authService: AuthService,
    private paymentService: PaymentService,
    private interviewService: InterviewService,
    private userService: UserService,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.fetchApplications();
    this.checkSubscription();
    this.loadPaymentKey();
  }

  loadPaymentKey() {
    this.paymentService.getPaymentKey().subscribe({
      next: (res: any) => this.razorpayKey = res?.data?.key || '',
      error: () => this.razorpayKey = 'rzp_test_SirlxvTw5D0T5m'
    });
  }

  checkSubscription() {
    const user = this.authService.getUser();
    if (!user?.userId) return;

    this.paymentService.getSubscription(user.userId).subscribe({
      next: (res: any) => {
        this.hasSubscription = res?.data?.status === 'ACTIVE'
          && ['PREMIUM', 'PROFESSIONAL', 'ENTERPRISE'].includes(res.data.plan);
      },
      error: () => this.hasSubscription = false
    });
  }

  fetchApplications() {
    const user = this.authService.getUser();
    if (!user?.userId) return;

    this.loadInterviews(user.userId);
    this.applicationService.getByUser(user.userId).subscribe({
      next: (data) => this.enrichApplications(data),
      error: () => this.isLoading = false
    });
  }

  loadInterviews(userId: number) {
    this.interviewService.getByUser(userId).subscribe({
      next: (interviews: any[]) => {
        this.interviewsByApplication = interviews.reduce((acc, interview) => {
          acc[interview.applicationId] = interview;
          return acc;
        }, {} as Record<number, any>);
      },
      error: () => this.interviewsByApplication = {}
    });
  }

  enrichApplications(applications: any[]) {
    if (!applications.length) {
      this.applications = [];
      this.isLoading = false;
      return;
    }

    forkJoin(applications.map(app =>
      this.jobService.getJobById(app.jobId).pipe(
        switchMap((job: any) =>
          this.userService.getUserById(job?.employerId).pipe(
            map((employer: any) => ({
              ...app,
              jobTitle: job?.title || `Job ${app.jobId}`,
              jobLocation: job?.location || 'Remote',
              companyName: job?.companyName || '',
              employerEmail: employer?.email || ''
            })),
            catchError(() => of({
              ...app,
              jobTitle: job?.title || `Job ${app.jobId}`,
              jobLocation: job?.location || 'Remote',
              companyName: job?.companyName || '',
              employerEmail: ''
            }))
          )
        ),
        catchError(() => of({
          ...app,
          jobTitle: `Job ${app.jobId}`,
          jobLocation: '',
          companyName: '',
          employerEmail: ''
        }))
      )
    )).subscribe({
      next: (enrichedApplications) => {
        this.applications = enrichedApplications;
        this.isLoading = false;
      },
      error: () => {
        this.applications = applications;
        this.isLoading = false;
      }
    });
  }

  subscribe() {
    const user = this.authService.getUser();
    if (!user?.userId) return;

    this.isSubscribing = true;
    this.checkoutStage = 'Creating order...';
    this.paymentCompleted = false;
    this.message = '';

    this.paymentService.createSubscription({ userId: user.userId, plan: 'PROFESSIONAL' }).subscribe({
      next: () => this.createAndOpenCheckout(user),
      error: () => {
        this.isSubscribing = false;
        this.checkoutStage = '';
        this.showMessage('error', 'Could not create subscription request.');
      }
    });
  }

  createAndOpenCheckout(user: any) {
    this.paymentService.createOrder(99).subscribe({
      next: (orderText: string) => {
        const order = this.parseOrder(orderText);
        this.checkoutStage = 'Opening Razorpay...';

        this.loadRazorpayScript().then((loaded) => {
          if (!loaded || !(window as any).Razorpay || order.mode?.startsWith('DUMMY')) {
            this.runDummyCheckout(user.userId, order);
            return;
          }

          const checkout = new (window as any).Razorpay({
            key: this.razorpayKey || 'rzp_test_SirlxvTw5D0T5m',
            amount: order.amount || 9900,
            currency: order.currency || 'INR',
            name: 'HireConnect',
            description: 'Candidate Premium',
            order_id: order.id,
            prefill: {
              name: user.email?.split('@')[0] || 'Candidate',
              email: user.email
            },
            theme: {
              color: '#16a34a'
            },
            handler: (response: any) => {
              this.zone.run(() => {
                this.checkoutStage = 'Verifying payment...';
                this.verifyCandidatePayment(user.userId, {
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature
                });
              });
            },
            modal: {
              ondismiss: () => {
                this.zone.run(() => {
                  this.isSubscribing = false;
                  this.checkoutStage = '';
                  this.showMessage('error', 'Payment cancelled. Your subscription was not activated.');
                });
              }
            }
          });

          checkout.on('payment.failed', () => {
            this.zone.run(() => {
              this.isSubscribing = false;
              this.checkoutStage = '';
              this.showMessage('error', 'Payment failed. Please try again.');
            });
          });

          checkout.open();
        });
      },
      error: () => {
        this.isSubscribing = false;
        this.checkoutStage = '';
        this.showMessage('error', 'Failed to initiate subscription');
      }
    });
  }

  verifyCandidatePayment(userId: number, payment: { orderId: string; paymentId: string; signature?: string }) {
    this.paymentService.verifyPayment({
      userId: String(userId),
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      signature: payment.signature,
      plan: 'PROFESSIONAL'
    }).subscribe({
      next: (res: any) => {
        if (res?.success === false) {
          this.isSubscribing = false;
          this.checkoutStage = '';
          this.showMessage('error', res?.message || 'Payment verification failed.');
          return;
        }
        this.hasSubscription = true;
        this.paymentCompleted = true;
        this.isSubscribing = false;
        this.checkoutStage = '';
        this.showMessage('success', 'Candidate Premium activated successfully.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.isSubscribing = false;
        this.checkoutStage = '';
        this.showMessage('error', 'Payment verification failed.');
      }
    });
  }

  runDummyCheckout(userId: number, order: any) {
    this.showDummyCheckout = true;
    this.checkoutStage = 'Opening test checkout...';
    setTimeout(() => this.checkoutStage = 'Processing test payment...', 800);
    setTimeout(() => this.checkoutStage = 'Confirming payment...', 1700);
    setTimeout(() => {
      this.showDummyCheckout = false;
      this.checkoutStage = 'Verifying payment...';
      this.verifyCandidatePayment(userId, {
        orderId: order.id || `order_dummy_${Date.now()}`,
        paymentId: `pay_dummy_${Date.now()}`
      });
    }, 2700);
  }

  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  parseOrder(orderText: string) {
    try {
      return JSON.parse(orderText);
    } catch {
      return { id: orderText };
    }
  }

  statusClass(status: string) {
    return {
      applied: status === 'APPLIED',
      interview: status === 'INTERVIEW_SCHEDULED',
      success: status === 'OFFERED' || status === 'ACCEPTED',
      rejected: status === 'REJECTED',
      shortlisted: status === 'SHORTLISTED'
    };
  }

  openApplicationDetails(app: any) {
    this.selectedApplicationId = this.selectedApplicationId === app.id ? null : app.id;

    if (!this.hasSubscription) {
      this.showMessage('error', 'Please activate Candidate Premium to check application status.');
    }
  }

  interviewStatusClass(status: string) {
    return {
      interview: status === 'SCHEDULED' || status === 'RESCHEDULED',
      success: status === 'CONFIRMED' || status === 'COMPLETED',
      rejected: status === 'CANCELLED',
      shortlisted: status === 'RESCHEDULE_REQUESTED'
    };
  }

  confirmInterview(interview: any) {
    this.interviewService.confirmInterview(interview.id).subscribe({
      next: (updated) => this.interviewsByApplication[updated.applicationId] = updated,
      error: () => this.showMessage('error', 'Could not confirm interview.')
    });
  }

  toggleReschedule(interview: any) {
    this.refreshMinDateTime();
    this.reschedulingInterviewId = this.reschedulingInterviewId === interview.id ? null : interview.id;
    this.rescheduleForm = {
      requestedInterviewDate: '',
      reason: ''
    };
  }

  requestReschedule(interview: any) {
    this.refreshMinDateTime();
    if (!this.isFutureDateTime(this.rescheduleForm.requestedInterviewDate)) {
      this.showMessage('error', 'Please select a future date and time for rescheduling.');
      return;
    }

    this.isRescheduling = true;
    this.interviewService.requestReschedule(interview.id, this.rescheduleForm).subscribe({
      next: (updated) => {
        this.interviewsByApplication[updated.applicationId] = updated;
        this.reschedulingInterviewId = null;
        this.isRescheduling = false;
        this.showMessage('success', 'Reschedule request sent.');
      },
      error: () => {
        this.isRescheduling = false;
        this.showMessage('error', 'Could not request reschedule.');
      }
    });
  }

  showMessage(type: 'success' | 'error', message: string) {
    this.messageType = type;
    this.message = message;
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
}
