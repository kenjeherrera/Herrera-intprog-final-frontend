import { Component } from '@angular/core';

import { AccountService } from '@app/_services';

@Component({
  templateUrl: 'details.component.html',
  standalone: false,
})
export class DetailsComponent {
  constructor(private accountSevice: AccountService) {}

  get account() {
    return this.accountSevice.accountValue;
  }
}
