import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';

type Plan = {
  id: 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE';
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-heading subscription-heading">
      <div>
        <p class="eyebrow">Recruiter billing</p>
        <h1>Choose your hiring plan</h1>
        <p>Use Razorpay test checkout for local payments. Your plan activates after the checkout callback is verified.</p>
      </div>
      <div *ngIf="currentSubscription" class="current-plan">
        <span>Current plan</span>
        <strong>{{ currentSubscription.plan }}</strong>
        <small>{{ currentSubscription.status }}</small>
      </div>
    </section>

    <div *ngIf="message" class="subscription-message" [ngClass]="messageType">
      {{ message }}
    </div>

    <section *ngIf="paymentCompleted && currentSubscription" class="payment-complete-panel">
      <div>
        <p class="eyebrow">Payment complete</p>
        <h2>{{ completedPlanName }} is active</h2>
        <p>Your recruiter subscription has been updated. You can continue managing jobs and applicants with the active plan.</p>
      </div>
      <div class="payment-complete-meta">
        <span>{{ currentSubscription.status }}</span>
        <strong>{{ currentSubscription.plan }}</strong>
        <small *ngIf="currentSubscription.endDate">Valid until {{ currentSubscription.endDate | date }}</small>
      </div>
    </section>

    <section class="pricing-grid">
      <article *ngFor="let plan of plans" class="pricing-card" [class.featured]="plan.highlighted">
        <div>
          <p class="plan-name">{{ plan.name }}</p>
          <p class="plan-description">{{ plan.description }}</p>
          <div class="price-row">
            <span *ngIf="plan.price > 0">Rs {{ plan.price }}</span>
            <span *ngIf="plan.price === 0">Free</span>
            <small>{{ plan.period }}</small>
          </div>
        </div>

        <ul>
          <li *ngFor="let feature of plan.features">{{ feature }}</li>
        </ul>

        <button class="btn full" [ngClass]="plan.highlighted ? 'btn-primary' : 'btn-secondary'"
                [disabled]="isPlanDisabled(plan)"
                (click)="selectPlan(plan)">
          <span *ngIf="isProcessing && selectedPlan === plan.id">{{ checkoutStage || 'Processing...' }}</span>
          <span *ngIf="!(isProcessing && selectedPlan === plan.id)">
            {{ planButtonText(plan) }}
          </span>
        </button>
      </article>
    </section>

    <div *ngIf="showDummyCheckout" class="checkout-backdrop">
      <section class="checkout-modal">
        <div class="checkout-loader"></div>
        <p class="eyebrow">Test checkout</p>
        <h2>{{ checkoutStage }}</h2>
        <p>This fallback simulates the Razorpay test payment animation when the checkout script cannot load.</p>
      </section>
    </div>

    <section class="payment-note">
      <h2>Razorpay test mode</h2>
      <p>Use Razorpay test payment details in the checkout modal. No real money is charged in test mode.</p>
    </section>
  `
})
export class SubscriptionComponent implements OnInit {
  plans: Plan[] = [
    {
      id: 'FREE',
      name: 'Free',
      price: 0,
      period: 'limited access',
      description: 'Start posting with basic recruiter access.',
      features: ['Limited active job posts', 'View incoming applications', 'Basic candidate pipeline']
    },
    {
      id: 'PROFESSIONAL',
      name: 'Professional',
      price: 999,
      period: 'per month',
      description: 'For active hiring teams that need a faster workflow.',
      features: ['More job postings', 'Shortlist and interview workflow', 'Recruiter analytics access', 'Priority notifications'],
      highlighted: true
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: 2499,
      period: 'per month',
      description: 'For larger teams managing multiple hiring pipelines.',
      features: ['Unlimited job campaigns', 'Advanced hiring analytics', 'Team-ready billing', 'Premium support']
    }
  ];

  currentSubscription: any;
  isProcessing = false;
  selectedPlan = '';
  checkoutStage = '';
  showDummyCheckout = false;
  paymentCompleted = false;
  completedPlanName = '';
  razorpayKey = '';
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private paymentService: PaymentService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('reason') === 'analytics') {
        this.showMessage('error', 'Subscribe to a paid plan to view analytics.');
      }
    });

    this.loadSubscription();
    this.loadPaymentKey();
  }

  loadPaymentKey() {
    this.paymentService.getPaymentKey().subscribe({
      next: (res: any) => this.razorpayKey = res?.data?.key || '',
      error: () => this.razorpayKey = 'rzp_test_SirlxvTw5D0T5m'
    });
  }

  loadSubscription() {
    const user = this.authService.getUser();
    if (!user?.userId) return;

    this.paymentService.getSubscription(user.userId).subscribe({
      next: (res: any) => this.currentSubscription = this.normalizeSubscription(res?.data),
      error: () => this.currentSubscription = { plan: 'FREE', status: 'ACTIVE' }
    });
  }

  selectPlan(plan: Plan) {
    const user = this.authService.getUser();
    if (!user?.userId) return;

    this.isProcessing = true;
    this.selectedPlan = plan.id;
    this.checkoutStage = plan.price === 0 ? 'Activating plan...' : 'Creating order...';
    this.paymentCompleted = false;
    this.message = '';

    this.paymentService.createSubscription({ userId: user.userId, plan: plan.id }).subscribe({
      next: () => plan.price === 0 ? this.runDummyCheckout(user.userId, plan, { id: 'order_free_plan' }) : this.createAndOpenCheckout(user, plan),
      error: () => {
        this.isProcessing = false;
        this.checkoutStage = '';
        this.showMessage('error', 'Could not create subscription request.');
      }
    });
  }

  createAndOpenCheckout(user: any, plan: Plan) {
    this.paymentService.createOrder(plan.price).subscribe({
      next: (orderText: string) => {
        const order = this.parseOrder(orderText);
        this.checkoutStage = 'Opening Razorpay...';

        this.loadRazorpayScript().then((loaded) => {
          if (!loaded || !(window as any).Razorpay || order.mode?.startsWith('DUMMY')) {
            this.runDummyCheckout(user.userId, plan, order);
            return;
          }

          const checkout = new (window as any).Razorpay({
            key: this.razorpayKey || 'rzp_test_SirlxvTw5D0T5m',
            amount: order.amount || plan.price * 100,
            currency: order.currency || 'INR',
            name: 'HireConnect',
            description: `${plan.name} recruiter plan`,
            order_id: order.id,
            prefill: {
              name: user.email?.split('@')[0] || 'Recruiter',
              email: user.email
            },
            theme: {
              color: '#16a34a'
            },
            handler: (response: any) => {
              this.zone.run(() => {
                this.checkoutStage = 'Verifying payment...';
                this.verifyAndActivate(user.userId, plan, {
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature
                });
              });
            },
            modal: {
              ondismiss: () => {
                this.zone.run(() => {
                  this.isProcessing = false;
                  this.checkoutStage = '';
                  this.showMessage('error', 'Payment cancelled. Your plan was not activated.');
                });
              }
            }
          });

          checkout.on('payment.failed', () => {
            this.zone.run(() => {
              this.isProcessing = false;
              this.checkoutStage = '';
              this.showMessage('error', 'Payment failed. Please try again.');
            });
          });

          checkout.open();
        });
      },
      error: () => {
        this.isProcessing = false;
        this.checkoutStage = '';
        this.showMessage('error', 'Could not create payment order.');
      }
    });
  }

  verifyAndActivate(userId: number, plan: Plan, payment: { orderId: string; paymentId: string; signature?: string }) {
    this.paymentService.verifyPayment({
      userId: String(userId),
      orderId: payment.orderId,
      paymentId: payment.paymentId,
      signature: payment.signature,
      plan: plan.id
    }).subscribe({
      next: (res: any) => {
        if (res?.success === false) {
          this.isProcessing = false;
          this.checkoutStage = '';
          this.showMessage('error', res?.message || 'Payment verification failed.');
          return;
        }
        this.currentSubscription = res?.data;
        this.isProcessing = false;
        this.checkoutStage = '';
        this.paymentCompleted = true;
        this.completedPlanName = plan.name;
        this.showMessage('success', `${plan.name} plan activated successfully.`);
        this.loadSubscription();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: () => {
        this.isProcessing = false;
        this.checkoutStage = '';
        this.showMessage('error', 'Payment verification failed.');
      }
    });
  }

  runDummyCheckout(userId: number, plan: Plan, order: any) {
    this.showDummyCheckout = true;
    this.checkoutStage = 'Opening test checkout...';
    setTimeout(() => this.checkoutStage = 'Processing test payment...', 800);
    setTimeout(() => this.checkoutStage = 'Confirming payment...', 1700);
    setTimeout(() => {
      this.showDummyCheckout = false;
      this.checkoutStage = 'Verifying payment...';
      this.verifyAndActivate(userId, plan, {
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

  isCurrentPlan(planId: string) {
    return this.currentSubscription?.plan === planId && this.currentSubscription?.status === 'ACTIVE';
  }

  hasActiveSubscription() {
    return this.currentSubscription?.status === 'ACTIVE';
  }

  isPlanDisabled(plan: Plan) {
    return plan.id === 'FREE' || this.isProcessing || this.isCurrentPlan(plan.id) || this.isLowerThanActivePlan(plan.id);
  }

  planButtonText(plan: Plan) {
    if (plan.id === 'FREE') {
      return 'Free plan';
    }

    if (this.isCurrentPlan(plan.id)) {
      return 'Active plan';
    }

    return plan.price === 0 ? 'Use free plan' : 'Pay with Razorpay';
  }

  isLowerThanActivePlan(planId: Plan['id']) {
    const activePlan = this.currentSubscription?.status === 'ACTIVE' ? this.currentSubscription?.plan : '';
    return this.planRank(planId) < this.planRank(activePlan);
  }

  planRank(planId: string) {
    const ranks: Record<string, number> = {
      FREE: 0,
      PROFESSIONAL: 1,
      ENTERPRISE: 2
    };

    return ranks[planId] ?? -1;
  }

  normalizeSubscription(subscription: any) {
    if (!subscription || subscription.plan === 'FREE') {
      return { ...(subscription || {}), plan: 'FREE', status: 'ACTIVE' };
    }

    return subscription;
  }

  showMessage(type: 'success' | 'error', message: string) {
    this.messageType = type;
    this.message = message;
  }
}
