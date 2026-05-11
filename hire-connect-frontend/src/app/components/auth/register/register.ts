import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.html'
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage = '';
  isLoading = false;
  isSigningUp = false;
  showPassword = false;
  otpSent = false;
  otpConfirmed = false;
  otpEmail = '';
  isVerifyingOtp = false;

  constructor(
    private fb: FormBuilder, 
    private auth: AuthService, 
    private router: Router,
    private toastService: ToastService
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.pattern('^[a-zA-Z ]+$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.pattern('^(?=.*[A-Z])(?=.*\\d).+$')]],
      role: ['CANDIDATE', Validators.required],
      otp: ['']
    });

    this.registerForm.get('email')?.valueChanges.subscribe((email) => {
      if (this.otpSent && this.normalizeEmail(email) !== this.otpEmail) {
        this.resetOtpState();
      }
    });

    this.registerForm.get('otp')?.valueChanges.subscribe(() => {
      if (this.otpConfirmed) {
        this.otpConfirmed = false;
      }
    });
  }

  onRegister() {
    if (!this.otpConfirmed || this.normalizeEmail(this.registerForm.value.email) !== this.otpEmail) {
      this.errorMessage = this.otpSent ? 'Please submit the OTP before signup.' : 'Please verify your email before signup.';
      this.toastService.show('error', this.errorMessage);
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.isSigningUp = true;
    this.errorMessage = '';

    this.auth.register(this.registerForm.value).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.isSigningUp = false;
        this.toastService.show('success', 'Registered successfully!');
        const role = res.role || this.registerForm.value.role;
        if (role === 'EMPLOYER') {
          this.router.navigate(['/my-jobs']);
        } else {
          this.router.navigate(['/jobs']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.isSigningUp = false;
        this.errorMessage = err.error?.message || 'Registration Failed';
        this.toastService.show('error', this.errorMessage);
      }
    });
  }

  sendOtp() {
    if (this.otpConfirmed) {
      return;
    }

    const fieldsToValidate = ['name', 'email'];
    const hasInvalidFields = fieldsToValidate.some(field => this.registerForm.get(field)?.invalid);

    if (hasInvalidFields) {
      fieldsToValidate.forEach(field => this.registerForm.get(field)?.markAsTouched());
      this.errorMessage = this.getVerifyValidationMessage();
      this.toastService.show('error', this.errorMessage);
      return;
    }

    this.isLoading = true;
    this.isSigningUp = false;
    this.errorMessage = '';

    this.auth.sendRegistrationOtp(this.registerForm.value.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.otpSent = true;
        this.otpConfirmed = false;
        this.otpEmail = this.normalizeEmail(this.registerForm.value.email);
        this.registerForm.get('otp')?.setValue('');
        this.registerForm.get('otp')?.setValidators([Validators.required, Validators.pattern('^[0-9]{6}$')]);
        this.registerForm.get('otp')?.updateValueAndValidity();
        this.toastService.show('success', 'Verification OTP sent to your email.');
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.getVerifyErrorMessage(err);
        this.toastService.show('error', this.errorMessage);
      }
    });
  }

  submitOtp() {
    if (!this.otpSent || this.normalizeEmail(this.registerForm.value.email) !== this.otpEmail) {
      this.errorMessage = 'Please verify your email first.';
      this.toastService.show('error', this.errorMessage);
      return;
    }

    const otpControl = this.registerForm.get('otp');
    if (otpControl?.invalid) {
      otpControl.markAsTouched();
      return;
    }

    this.isLoading = true;
    this.isVerifyingOtp = true;
    this.errorMessage = '';

    this.auth.verifyRegistrationOtp(this.registerForm.value.email, otpControl?.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.isVerifyingOtp = false;
        this.otpConfirmed = true;
        this.errorMessage = '';
        this.toastService.show('success', 'Email verified. Complete signup to create your account.');
      },
      error: (err) => {
        this.isLoading = false;
        this.isVerifyingOtp = false;
        this.otpConfirmed = false;
        this.errorMessage = this.getOtpErrorMessage(err);
        this.toastService.show('error', this.errorMessage);
      }
    });
  }

  canSignup() {
    return this.otpConfirmed && this.registerForm.valid && this.normalizeEmail(this.registerForm.value.email) === this.otpEmail;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  loginWithGoogle() {
    this.auth.startOAuthLogin('google', this.registerForm.value.role);
  }

  loginWithGithub() {
    this.auth.startOAuthLogin('github', this.registerForm.value.role);
  }

  private normalizeEmail(email: string) {
    return (email || '').trim().toLowerCase();
  }

  private resetOtpState() {
    this.otpSent = false;
    this.otpConfirmed = false;
    this.otpEmail = '';
    this.registerForm.get('otp')?.clearValidators();
    this.registerForm.get('otp')?.setValue('');
    this.registerForm.get('otp')?.updateValueAndValidity();
  }

  private getVerifyValidationMessage() {
    const nameControl = this.registerForm.get('name');
    const emailControl = this.registerForm.get('email');

    if (nameControl?.invalid) {
      return 'Please enter a valid username first.';
    }

    if (emailControl?.hasError('required')) {
      return 'Email is required.';
    }

    if (emailControl?.invalid) {
      return 'Email is incorrect.';
    }

    return 'Please complete username and email before verification.';
  }

  private getVerifyErrorMessage(err: any) {
    const message = this.extractErrorMessage(err);
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes('already exists')) {
      return 'Email already exists.';
    }

    if (normalizedMessage.includes('invalid email')) {
      return 'Email is incorrect.';
    }

    return message || 'Unable to send OTP.';
  }

  private getOtpErrorMessage(err: any) {
    const message = this.extractErrorMessage(err);
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes('invalid') || normalizedMessage.includes('expired')) {
      return 'Invalid or expired OTP.';
    }

    return message || 'Unable to verify OTP.';
  }

  private extractErrorMessage(err: any) {
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

    return err?.message || '';
  }
}
