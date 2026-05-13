import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html'
})
export class LoginComponent {
  loginForm: FormGroup;
  resetForm: FormGroup;
  errorMessage = '';
  resetMessage = '';
  isLoading = false;
  isResetLoading = false;
  showPassword = false;
  showResetPassword = false;
  showForgotPassword = false;
  resetOtpSent = false;
  resetOtpVerified = false;
  resetOtpEmail = '';
  isVerifyingResetOtp = false;

  constructor(
    private fb: FormBuilder, 
    private auth: AuthService, 
    private router: Router,
    private toastService: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      otp: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.pattern('^(?=.*[A-Z])(?=.*\\d).+$')]]
    });

    this.resetForm.get('email')?.valueChanges.subscribe((email) => {
      if (this.resetOtpSent && this.normalizeEmail(email) !== this.resetOtpEmail) {
        this.resetPasswordOtpState();
      }
    });

    this.resetForm.get('otp')?.valueChanges.subscribe(() => {
      if (this.resetOtpVerified) {
        this.resetOtpVerified = false;
      }
    });
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.auth.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.toastService.show('success', 'Logged in successfully!');
        if (res.role === 'EMPLOYER') {
          this.router.navigate(['/my-jobs']);
        } else {
          this.router.navigate(['/jobs']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Login Failed';
        this.toastService.show('error', this.errorMessage);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleResetPasswordVisibility() {
    this.showResetPassword = !this.showResetPassword;
  }

  openForgotPassword() {
    const email = this.loginForm.get('email')?.value || '';
    this.showForgotPassword = true;
    this.errorMessage = '';
    this.resetMessage = '';
    this.resetOtpSent = false;
    this.resetOtpVerified = false;
    this.resetOtpEmail = '';
    this.resetForm.reset({ email, otp: '', password: '' });
  }

  closeForgotPassword() {
    this.showForgotPassword = false;
    this.resetMessage = '';
    this.resetOtpSent = false;
    this.resetOtpVerified = false;
    this.resetOtpEmail = '';
  }

  sendResetOtp() {
    if (this.resetOtpVerified) {
      return;
    }

    const emailControl = this.resetForm.get('email');
    if (emailControl?.invalid) {
      emailControl.markAsTouched();
      this.resetMessage = emailControl.hasError('required') ? 'Email is required.' : 'Email is incorrect.';
      this.toastService.show('error', this.resetMessage);
      return;
    }

    this.isResetLoading = true;
    this.resetMessage = '';

    this.auth.sendPasswordResetOtp(emailControl?.value).subscribe({
      next: () => {
        this.isResetLoading = false;
        this.resetOtpSent = true;
        this.resetOtpVerified = false;
        this.resetOtpEmail = this.normalizeEmail(emailControl?.value);
        this.resetForm.get('otp')?.setValue('');
        this.toastService.show('success', 'Password reset OTP sent to your email.');
      },
      error: (err) => {
        this.isResetLoading = false;
        this.resetMessage = this.getResetErrorMessage(err, 'Unable to send password reset OTP.');
        this.toastService.show('error', this.resetMessage);
      }
    });
  }

  verifyResetOtp() {
    if (!this.resetOtpSent || this.normalizeEmail(this.resetForm.value.email) !== this.resetOtpEmail) {
      this.resetMessage = 'Please verify your email first.';
      this.toastService.show('error', this.resetMessage);
      return;
    }

    const otpControl = this.resetForm.get('otp');
    if (otpControl?.invalid) {
      otpControl.markAsTouched();
      return;
    }

    this.isResetLoading = true;
    this.isVerifyingResetOtp = true;
    this.resetMessage = '';

    this.auth.verifyPasswordResetOtp(this.resetForm.value.email, otpControl?.value).subscribe({
      next: () => {
        this.isResetLoading = false;
        this.isVerifyingResetOtp = false;
        this.resetOtpVerified = true;
        this.resetMessage = '';
        this.toastService.show('success', 'Email verified. Choose a new password.');
      },
      error: (err) => {
        this.isResetLoading = false;
        this.isVerifyingResetOtp = false;
        this.resetOtpVerified = false;
        this.resetMessage = this.getResetOtpErrorMessage(err);
        this.toastService.show('error', this.resetMessage);
      }
    });
  }

  resetPassword() {
    if (!this.resetOtpSent) {
      this.sendResetOtp();
      return;
    }

    if (!this.resetOtpVerified || this.normalizeEmail(this.resetForm.value.email) !== this.resetOtpEmail) {
      this.resetMessage = 'Please submit the OTP before resetting password.';
      this.toastService.show('error', this.resetMessage);
      return;
    }

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isResetLoading = true;
    this.resetMessage = '';

    this.auth.resetPassword(this.resetForm.value).subscribe({
      next: () => {
        this.isResetLoading = false;
        this.toastService.show('success', 'Password reset successfully. Please log in.');
        this.loginForm.patchValue({ email: this.resetForm.value.email, password: '' });
        this.closeForgotPassword();
      },
      error: (err) => {
        this.isResetLoading = false;
        this.resetMessage = this.getResetErrorMessage(err, 'Unable to reset password.');
        this.toastService.show('error', this.resetMessage);
      }
    });
  }

  loginWithGoogle() {
    this.auth.startOAuthLogin('google');
  }

  loginWithGithub() {
    this.auth.startOAuthLogin('github');
  }

  private getResetErrorMessage(err: any, fallback: string) {
    const error = err?.error;
    if (error?.message) {
      return error.message;
    }
    if (typeof error === 'string') {
      try {
        const parsedError = JSON.parse(error);
        return parsedError?.message || error;
      } catch {
        return error;
      }
    }
    return err?.message || fallback;
  }

  private getResetOtpErrorMessage(err: any) {
    const message = this.getResetErrorMessage(err, 'Unable to verify OTP.');
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes('invalid') || normalizedMessage.includes('expired')) {
      return 'Invalid or expired OTP.';
    }

    return message;
  }

  private resetPasswordOtpState() {
    this.resetOtpSent = false;
    this.resetOtpVerified = false;
    this.resetOtpEmail = '';
    this.resetForm.get('otp')?.setValue('');
  }

  private normalizeEmail(email: string) {
    return (email || '').trim().toLowerCase();
  }
}
