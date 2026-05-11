import { Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html'
})
export class AppComponent implements OnInit {
  isDarkMode = false;
  isMobileMenuOpen = false;
  isProfileMenuOpen = false;
  showFooter = true;

  constructor(
    public auth: AuthService,
    public toastService: ToastService,
    private router: Router
  ) {
    const savedTheme = localStorage.getItem('hireconnect-theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    this.isDarkMode = savedTheme ? savedTheme === 'dark' : prefersDark;
    this.applyTheme();
  }

  ngOnInit() {
    this.updateFooterVisibility(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.updateFooterVisibility(event.urlAfterRedirects));

    setTimeout(() => this.auth.refreshCurrentUserProfile());
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('hireconnect-theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.isProfileMenuOpen = false;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const clickedInsideMobileNav = target?.closest('.mobile-menu, .mobile-actions');

    if (!clickedInsideMobileNav) {
      this.closeMobileMenu();
    }

    this.closeProfileMenu();
  }

  closeProfileMenu() {
    this.isProfileMenuOpen = false;
  }

  displayName(user: any) {
    const emailPrefix = user?.email?.split('@')[0];
    const savedName = user?.name || user?.username;
    return savedName && savedName !== emailPrefix ? savedName : 'Profile';
  }

  get brandRoute() {
    return this.auth.getUser()?.role === 'EMPLOYER' ? '/my-jobs' : '/jobs';
  }

  logout() {
    this.closeMobileMenu();
    this.closeProfileMenu();
    this.auth.logout();
  }

  private applyTheme() {
    document.body.classList.toggle('dark-theme', this.isDarkMode);
  }

  private updateFooterVisibility(url: string) {
    const path = url.split('?')[0].split('#')[0];
    this.showFooter = !['/login', '/register', '/signup'].includes(path);
  }
}
