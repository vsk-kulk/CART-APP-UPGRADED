import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SellerComponent } from './seller.component';

@NgModule({
  declarations: [SellerComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild([{ path: '', component: SellerComponent }])],
})
export class SellerModule {}
