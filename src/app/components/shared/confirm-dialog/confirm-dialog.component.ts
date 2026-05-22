import { Component } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ConfirmDialogService, ConfirmDialogData } from '@services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  standalone: false,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' })),
      ]),
    ]),
  ],
})
export class ConfirmDialogComponent {
  dialogData: ConfirmDialogData | null = null;
  isVisible = false;

  constructor(private confirmDialogService: ConfirmDialogService) {
    this.confirmDialogService.dialog$.subscribe((data) => {
      this.dialogData = data;
      this.isVisible = !!data;
    });
  }

  confirm(): void {
    this.confirmDialogService.confirm();
  }

  cancel(): void {
    this.confirmDialogService.cancel();
  }

  getDialogIcon(): string {
    if (!this.dialogData) return '';

    switch (this.dialogData.type) {
      case 'add':
        return '➕';
      case 'remove':
        return '🗑️';
      case 'edit':
        return '✏️';
      case 'delete':
        return '⚠️';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  }

  getConfirmButtonText(): string {
    return this.dialogData?.confirmText || 'Confirm';
  }

  getCancelButtonText(): string {
    return this.dialogData?.cancelText || 'Cancel';
  }
}
