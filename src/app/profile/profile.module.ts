import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { DetailsComponent } from './details.component';
import { LayoutComponent } from './layout.component';
import { ProfileRoutingModule } from './profile-routing.module';
import { UpdateComponent } from './update.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, ProfileRoutingModule],
  declarations: [LayoutComponent, DetailsComponent, UpdateComponent],
})
export class ProfileModule {}
