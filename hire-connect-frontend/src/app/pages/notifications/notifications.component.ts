import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="dashboard-heading">
        <div>
          <p class="eyebrow">Inbox</p>
          <h3>Notifications</h3>
          <p>Application updates, interviews, and job alerts appear here.</p>
        </div>
        <button class="btn btn-secondary" (click)="markAllAsRead()" [disabled]="isLoading || notifications.length === 0">
          Mark all as read
        </button>
      </div>

      <div *ngIf="isLoading" class="loading-state">Loading notifications...</div>

      <div *ngIf="!isLoading && notifications.length === 0" class="empty-state">
        <h2>No notifications yet</h2>
        <p>You are all caught up.</p>
      </div>

      <section *ngIf="!isLoading && notifications.length > 0" class="notification-list">
        <article *ngFor="let notification of notifications" class="notification-card" [class.unread]="!notification.read">
          <div>
            <p class="eyebrow">{{ notification.type || 'GENERAL' }}</p>
            <h4>{{ notification.subject }}</h4>
            <p>{{ notification.message }}</p>
            <small>{{ formatDateTime(notification.createdAt) }}</small>
          </div>
          <button *ngIf="!notification.read" type="button" (click)="markAsRead(notification)" class="btn btn-secondary">
            Mark read
          </button>
        </article>
      </section>
    </div>
  `
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  isLoading = true;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    const user = this.authService.getUser();
    if (!user?.userId) {
      this.isLoading = false;
      return;
    }

    this.notificationService.getByUser(user.userId).subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.isLoading = false;
      },
      error: () => {
        this.notifications = [];
        this.isLoading = false;
      }
    });
  }

  markAsRead(notification: any) {
    this.notificationService.markAsRead(notification.id).subscribe({
      next: (updated) => Object.assign(notification, updated)
    });
  }

  markAllAsRead() {
    const user = this.authService.getUser();
    if (!user?.userId) return;

    this.notificationService.markAllAsRead(user.userId).subscribe({
      next: () => {
        this.notifications = this.notifications.map(notification => ({
          ...notification,
          read: true
        }));
      }
    });
  }

  formatDateTime(value: string, fallback = '') {
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
