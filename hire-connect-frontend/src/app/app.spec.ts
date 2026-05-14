import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AppComponent } from './app';
import { AuthService } from './services/auth.service';
import { ToastService } from './services/toast.service';

describe('AppComponent', () => {
  const authServiceMock = {
    currentUser$: of(null),
    getUser: jest.fn(),
    isLoggedIn: jest.fn(),
    logout: jest.fn(),
    refreshCurrentUserProfile: jest.fn(),
  };

  const toastServiceMock = {
    toast$: of(null),
  };

  beforeEach(async () => {
    localStorage.clear();
    document.body.classList.remove('dark-theme');
    authServiceMock.getUser.mockReturnValue(null);
    authServiceMock.isLoggedIn.mockReturnValue(false);
    authServiceMock.refreshCurrentUserProfile.mockClear();
    authServiceMock.logout.mockClear();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({ matches: false }),
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the HireConnect brand', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('HireConnect');
  });

  it('toggles and persists the active theme', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.toggleTheme();

    expect(app.isDarkMode).toBe(true);
    expect(localStorage.getItem('hireconnect-theme')).toBe('dark');
    expect(document.body.classList.contains('dark-theme')).toBe(true);
  });

  it('manages mobile and profile menu state', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.toggleProfileMenu();
    app.toggleMobileMenu();

    expect(app.isMobileMenuOpen).toBe(true);
    expect(app.isProfileMenuOpen).toBe(false);

    app.toggleProfileMenu();
    app.closeMobileMenu();
    app.closeProfileMenu();

    expect(app.isMobileMenuOpen).toBe(false);
    expect(app.isProfileMenuOpen).toBe(false);
  });

  it('closes menus when the document is clicked outside mobile navigation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.isMobileMenuOpen = true;
    app.isProfileMenuOpen = true;

    app.onDocumentClick({ target: document.createElement('button') } as unknown as MouseEvent);

    expect(app.isMobileMenuOpen).toBe(false);
    expect(app.isProfileMenuOpen).toBe(false);
  });

  it('keeps the mobile menu open when clicking inside mobile navigation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const mobileMenu = document.createElement('div');
    const button = document.createElement('button');
    mobileMenu.className = 'mobile-menu';
    mobileMenu.appendChild(button);
    app.isMobileMenuOpen = true;
    app.isProfileMenuOpen = true;

    app.onDocumentClick({ target: button } as unknown as MouseEvent);

    expect(app.isMobileMenuOpen).toBe(true);
    expect(app.isProfileMenuOpen).toBe(false);
  });

  it('formats profile display names', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.displayName({ name: 'Nisha', email: 'nisha@example.com' })).toBe('Nisha');
    expect(app.displayName({ username: 'nisha', email: 'nisha@example.com' })).toBe('Profile');
    expect(app.displayName(null)).toBe('Profile');
  });

  it('routes the brand link from the current user role', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app.brandRoute).toBe('/jobs');

    authServiceMock.getUser.mockReturnValue({ role: 'EMPLOYER' });

    expect(app.brandRoute).toBe('/my-jobs');
  });

  it('hides the footer on auth pages', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    (app as any).updateFooterVisibility('/login?next=/jobs#form');
    expect(app.showFooter).toBe(false);

    (app as any).updateFooterVisibility('/jobs');
    expect(app.showFooter).toBe(true);
  });

  it('closes menus before logging out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.isMobileMenuOpen = true;
    app.isProfileMenuOpen = true;

    app.logout();

    expect(app.isMobileMenuOpen).toBe(false);
    expect(app.isProfileMenuOpen).toBe(false);
    expect(authServiceMock.logout).toHaveBeenCalled();
  });
});
