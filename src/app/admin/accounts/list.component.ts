import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { finalize, first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';

@Component({ templateUrl: 'list.component.html', standalone: false })
export class ListComponent implements OnInit, OnDestroy {
  accounts: any[] = [];
  loading = false;
  showDeleteModal = false;
  selectedAccount: any | null = null;

  private loadTimeoutId?: number;

  constructor(
    private accountService: AccountService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loading = true;
    this.cdr.detectChanges();

    this.loadTimeoutId = window.setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.accounts = [];
        this.alertService.error('Request timed out');
        this.cdr.detectChanges();
      }
    }, 10000);
    this.accountService
      .getAll()
      .pipe(
        first(),
        finalize(() => {
          this.loading = false;
          if (this.loadTimeoutId) {
            window.clearTimeout(this.loadTimeoutId);
            this.loadTimeoutId = undefined;
          }
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (accounts) => {
          this.accounts = accounts;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.alertService.error(error);
          this.accounts = [];
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy() {
    if (this.loadTimeoutId) {
      window.clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = undefined;
    }
  }

  openDeleteModal(account: any) {
    this.selectedAccount = account;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedAccount = null;
  }

  confirmDelete() {
    if (!this.selectedAccount) return;

    this.selectedAccount.isDeleting = true;
    this.cdr.detectChanges();

    this.accountService
      .delete(this.selectedAccount.id)
      .pipe(first())
      .subscribe(() => {
        this.accounts = this.accounts.filter((x) => x.id !== this.selectedAccount.id);
        this.closeDeleteModal();
        this.cdr.detectChanges();
      });
  }
}
