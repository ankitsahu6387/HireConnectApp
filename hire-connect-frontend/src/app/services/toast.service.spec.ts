import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new ToastService();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('emits a toast and clears it after the timeout', () => {
    const values: any[] = [];
    service.toast$.subscribe((toast) => values.push(toast));

    service.show('success', 'Saved');

    expect(values.at(-1)).toEqual({ type: 'success', message: 'Saved' });

    jest.advanceTimersByTime(4000);

    expect(values.at(-1)).toBeNull();
  });
});
