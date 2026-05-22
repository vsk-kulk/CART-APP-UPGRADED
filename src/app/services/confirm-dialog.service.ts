import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'add' | 'remove' | 'edit' | 'delete' | 'warning' | 'info';
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  private dialogSubject = new BehaviorSubject<ConfirmDialogData | null>(null);
  public dialog$ = this.dialogSubject.asObservable();

  private resultSubject = new Subject<{ confirmed: boolean; data?: any }>();
  public result$ = this.resultSubject.asObservable();

  openConfirmDialog(dialogData: ConfirmDialogData): void {
    this.dialogSubject.next(dialogData);
  }

  closeDialog(): void {
    this.dialogSubject.next(null);
  }

  confirm(data?: any): void {
    this.resultSubject.next({ confirmed: true, data });
    this.closeDialog();
  }

  cancel(): void {
    this.resultSubject.next({ confirmed: false });
    this.closeDialog();
  }

  getDialogData(): ConfirmDialogData | null {
    return this.dialogSubject.value;
  }
}
