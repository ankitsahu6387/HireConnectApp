import { of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let http: {
    get: jest.Mock;
    post: jest.Mock;
  };
  let router: {
    navigate: jest.Mock;
  };
  let service: AuthService;

  const apiUrl = environment.apiUrl;
  const authUrl = `${apiUrl}/auth`;

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();

    http = {
      get: jest.fn(),
      post: jest.fn(),
    };
    router = {
      navigate: jest.fn(),
    };

    service = new AuthService(http as any, router as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    localStorage.clear();
  });

  it('starts with the user stored in localStorage', (done) => {
    const storedUser = {
      name: 'Asha',
      email: 'asha@example.com',
      role: 'CANDIDATE',
      userId: 7,
    };

    localStorage.setItem('user', JSON.stringify(storedUser));
    service = new AuthService(http as any, router as any);

    service.currentUser$.subscribe((user) => {
      expect(user).toEqual(storedUser);
      done();
    });
  });

  it('logs in, stores auth data, and publishes the current user', () => {
    const response = {
      token: 'jwt-token',
      name: 'Priya',
      email: 'priya@example.com',
      role: 'EMPLOYER',
      userId: 14,
    };
    const emittedUsers: any[] = [];

    http.post.mockReturnValue(of(response));
    service.currentUser$.subscribe((user) => emittedUsers.push(user));

    service.login({ email: response.email, password: 'secret' }).subscribe((result) => {
      expect(result).toEqual(response);
    });
    jest.runOnlyPendingTimers();

    expect(http.post).toHaveBeenCalledWith(`${authUrl}/login`, {
      email: response.email,
      password: 'secret',
    });
    expect(service.getToken()).toBe(response.token);
    expect(service.getUser()).toEqual({
      name: response.name,
      email: response.email,
      role: response.role,
      userId: response.userId,
    });
    expect(emittedUsers.at(-1)).toEqual(service.getUser());
  });

  it('registers a user and falls back to username when name is missing', () => {
    const response = {
      token: 'registration-token',
      username: 'newuser',
      email: 'newuser@example.com',
      role: 'CANDIDATE',
      userId: 21,
    };

    http.post.mockReturnValue(of(response));

    service.register({ email: response.email }).subscribe();
    jest.runOnlyPendingTimers();

    expect(http.post).toHaveBeenCalledWith(`${authUrl}/register`, {
      email: response.email,
    });
    expect(service.getUser()).toEqual({
      name: response.username,
      email: response.email,
      role: response.role,
      userId: response.userId,
    });
  });

  it('requests and verifies registration OTPs', () => {
    http.post.mockReturnValue(of('ok'));

    service.sendRegistrationOtp('test@example.com').subscribe();
    service.verifyRegistrationOtp('test@example.com', '123456').subscribe();

    expect(http.post).toHaveBeenNthCalledWith(
      1,
      `${authUrl}/send-registration-otp`,
      { email: 'test@example.com' },
      { responseType: 'text' },
    );
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      `${authUrl}/verify-registration-otp`,
      { email: 'test@example.com', otp: '123456' },
      { responseType: 'text' },
    );
  });

  it('requests, verifies, and resets password OTP flows', () => {
    http.post.mockReturnValue(of('ok'));

    service.sendPasswordResetOtp('test@example.com').subscribe();
    service.verifyPasswordResetOtp('test@example.com', '654321').subscribe();
    service.resetPassword({ email: 'test@example.com', password: 'new-pass' }).subscribe();

    expect(http.post).toHaveBeenNthCalledWith(
      1,
      `${authUrl}/send-password-reset-otp`,
      { email: 'test@example.com' },
      { responseType: 'text' },
    );
    expect(http.post).toHaveBeenNthCalledWith(
      2,
      `${authUrl}/verify-password-reset-otp`,
      { email: 'test@example.com', otp: '654321' },
      { responseType: 'text' },
    );
    expect(http.post).toHaveBeenNthCalledWith(
      3,
      `${authUrl}/reset-password`,
      { email: 'test@example.com', password: 'new-pass' },
      { responseType: 'text' },
    );
  });

  it('builds OAuth login URLs with optional roles', () => {
    expect(service.getOAuthLoginUrl('google')).toBe(`${apiUrl}/oauth2/authorization/google`);
    expect(service.getOAuthLoginUrl('github', 'EMPLOYER')).toBe(
      `${apiUrl}/oauth2/authorization/github?role=EMPLOYER`,
    );
  });

  it('completes OAuth login with returned auth data', () => {
    service.completeOAuthLogin({
      token: 'oauth-token',
      name: 'Ravi',
      email: 'ravi@example.com',
      role: 'CANDIDATE',
      userId: 31,
    });
    jest.runOnlyPendingTimers();

    expect(service.getToken()).toBe('oauth-token');
    expect(service.getUser()).toEqual({
      name: 'Ravi',
      email: 'ravi@example.com',
      role: 'CANDIDATE',
      userId: 31,
    });
  });

  it('refreshes the current user profile when stored auth data is available', () => {
    service.saveToken('jwt-token');
    service.saveUser({
      name: '',
      email: 'old@example.com',
      role: 'CANDIDATE',
      userId: 42,
    });
    http.get.mockReturnValue(
      of({
        name: 'Updated User',
        email: 'updated@example.com',
        role: 'EMPLOYER',
      }),
    );

    service.refreshCurrentUserProfile();

    expect(http.get).toHaveBeenCalledWith(`${apiUrl}/users/42`);
    expect(service.getUser()).toEqual({
      name: 'Updated User',
      email: 'updated@example.com',
      role: 'EMPLOYER',
      userId: 42,
    });
  });

  it('keeps the stored user when profile refresh fails', () => {
    const storedUser = {
      name: 'Cached User',
      email: 'cached@example.com',
      role: 'CANDIDATE',
      userId: 50,
    };
    const emittedUsers: any[] = [];

    service.saveToken('jwt-token');
    service.saveUser(storedUser);
    http.get.mockReturnValue(throwError(() => new Error('network failed')));
    service.currentUser$.subscribe((user) => emittedUsers.push(user));

    service.refreshCurrentUserProfile();

    expect(emittedUsers.at(-1)).toEqual(storedUser);
    expect(service.getUser()).toEqual(storedUser);
  });

  it('skips profile refresh without a stored user id or token', () => {
    service.refreshCurrentUserProfile();
    expect(http.get).not.toHaveBeenCalled();

    service.saveUser({ name: 'No Token', userId: 60 });
    service.refreshCurrentUserProfile();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('reports login status from the stored token', () => {
    expect(service.isLoggedIn()).toBe(false);

    service.saveToken('jwt-token');

    expect(service.isLoggedIn()).toBe(true);
  });

  it('logs out, clears stored auth data, and navigates to login', () => {
    const emittedUsers: any[] = [];

    service.saveToken('jwt-token');
    service.saveUser({ email: 'logout@example.com' });
    service.currentUser$.subscribe((user) => emittedUsers.push(user));

    service.logout();

    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toBeNull();
    expect(emittedUsers.at(-1)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
