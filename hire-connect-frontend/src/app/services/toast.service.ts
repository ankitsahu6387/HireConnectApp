import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  message: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast | null>();
  toast$ = this.toastSubject.asObservable();

  show(type: 'success' | 'error', message: string) {
    this.toastSubject.next({ type, message });
    setTimeout(() => {
      this.toastSubject.next(null);
    }, 4000);
  }
}
