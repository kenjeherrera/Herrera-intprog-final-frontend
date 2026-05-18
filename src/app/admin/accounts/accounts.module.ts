import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AccountsRoutingModule } from './accounts-routing.module';
import { AddEditComponent } from './add-edit.component';
import { ListComponent } from './list.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, AccountsRoutingModule],
  declarations: [ListComponent, AddEditComponent],
})
export class AccountsModule {}
