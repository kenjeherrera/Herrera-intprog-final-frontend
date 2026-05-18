import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';

import { MustMatch } from '@app/_helpers/must-match.validator';
import { AccountService, AlertService } from '@app/_services';

@Component({ templateUrl: 'add-edit.component.html', standalone: false })
export class AddEditComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  id?: string;
  title!: string;
  loading = false;
  submitting = false;
  submitted = false;

  private loadTimeoutId?: any;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private accountService: AccountService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];

    this.form = this.formBuilder.group(
      {
        title: ['', Validators.required],
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        role: ['', Validators.required],
        password: ['', [Validators.minLength(6), ...(!this.id ? [Validators.required] : [])]],
        confirmPassword: [''],
      },
      {
        validator: MustMatch('password', 'confirmPassword'),
      },
    );

    this.title = 'Create Account';
    if (this.id) {
      this.title = 'Edit Account';
      this.loading = true;
      this.cdr.detectChanges();

      this.accountService
        .getById(this.id)
        .pipe(first())
        .subscribe({
          next: (x) => {
            this.form.patchValue(x);
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.alertService.error(error);
            this.loading = false;
            this.cdr.detectChanges();
          },
        });
    }
  }

  ngOnDestroy() {
    if (this.loadTimeoutId) {
      clearTimeout(this.loadTimeoutId);
    }
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.cdr.detectChanges();
    this.alertService.clear();

    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.cdr.detectChanges();

    const saveAccount = this.id
      ? () => this.accountService.update(this.id!, this.form.value)
      : () => this.accountService.create(this.form.value);

    const message = this.id ? 'Account updated' : 'Account created';

    saveAccount()
      .pipe(first())
      .subscribe({
        next: () => {
          this.alertService.success(message, { keepAfterRouteChange: true });
          this.router.navigateByUrl('/admin/accounts');
        },
        error: (error) => {
          this.alertService.error(error);
          this.submitting = false;
          this.cdr.detectChanges();
        },
      });
  }
}
