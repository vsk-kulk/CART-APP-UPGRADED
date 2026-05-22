import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaymentConfirmationComponent } from './payment-confirmation.component';

@NgModule({
  declarations: [PaymentConfirmationComponent],
  imports: [CommonModule, RouterModule.forChild([{ path: '', component: PaymentConfirmationComponent }])],
})
export class PaymentConfirmationModule {}
