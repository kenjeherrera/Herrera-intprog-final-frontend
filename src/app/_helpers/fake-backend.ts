import {
  HTTP_INTERCEPTORS,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, dematerialize, materialize, mergeMap } from 'rxjs/operators';

import { Account, Role } from '@app/_models';
import { AlertService } from '@app/_services';

const accountsKey = 'angular-21-auth-boilerplate-accounts';
let accounts: Account[] = JSON.parse(localStorage.getItem(accountsKey) || '[]');

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
  constructor(private alertService: AlertService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const { url, method, headers, body } = request;
    const alertService = this.alertService; // capture 'this' for use inside inner functions

    return of(null)
      .pipe(mergeMap(handleRoute))
      .pipe(materialize())
      .pipe(delay(500))
      .pipe(dematerialize());

    function handleRoute() {
      switch (true) {
        case url.endsWith('/accounts/authenticate') && method === 'POST':
          return authenticate();
        case url.endsWith('/accounts/refresh-token') && method === 'POST':
          return refreshToken();
        case url.endsWith('/accounts/revoke-token') && method === 'POST':
          return revokeToken();
        case url.endsWith('/accounts/register') && method === 'POST':
          return register();
        case url.endsWith('/accounts/verify-email') && method === 'POST':
          return verifyEmail();
        case url.endsWith('/accounts/forgot-password') && method === 'POST':
          return forgotPassword();
        case url.endsWith('/accounts/validate-reset-token') && method === 'POST':
          return validateResetToken();
        case url.endsWith('/accounts/reset-password') && method === 'POST':
          return resetPassword();
        case url.endsWith('/accounts') && method === 'GET':
          return getAccounts();
        case url.match(/\/accounts\/[^\/]+$/) && method === 'GET':
          return getAccountById();
        case url.endsWith('/accounts') && method === 'POST':
          return createAccount();
        case url.match(/\/accounts\/[^\/]+$/) && method === 'PUT':
          return updateAccount();
        case url.match(/\/accounts\/[^\/]+$/) && method === 'DELETE':
          return deleteAccount();
        default:
          // pass through any requests not handled above
          return next.handle(request);
      }
    }

    // route functions

    function authenticate() {
      const { email, password } = body;
      const account = accounts.find(
        (x) => x.email === email && x.password === password && x.isVerified,
      );

      if (!account) return error('Email or password is incorrect');

      account.refreshTokens = account.refreshTokens || [];
      account.refreshTokens.push(generateRefreshToken());
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      return ok({
        ...basicDetails(account),
        jwtToken: generateJwtToken(account),
      });
    }

    function refreshToken() {
      const token = getRefreshToken();
      if (!token) return unauthorized();

      const account = accounts.find((x) => x.refreshTokens?.includes(token));
      if (!account) return unauthorized();

      const newRefreshToken = generateRefreshToken();
      account.refreshTokens = (account.refreshTokens || []).filter((x) => x !== token);
      account.refreshTokens.push(newRefreshToken);
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      return ok({
        ...basicDetails(account),
        jwtToken: generateJwtToken(account),
      });
    }

    function revokeToken() {
      const token = body.token || getRefreshToken();
      if (!token) return error('Token is required');

      const account = accounts.find((x) => x.refreshTokens?.includes(token));
      if (!account) return error('Invalid token');

      account.refreshTokens = account.refreshTokens?.filter((x) => x !== token);
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      return ok();
    }

    function register() {
      const account = body;

      if (accounts.find((x) => x.email === account.email)) {
        return error('Email "' + account.email + '" is already registered');
      }

      account.id = newAccountId();
      account.role = accounts.length === 0 ? Role.Admin : Role.User;
      account.isVerified = false;
      account.verificationToken = Math.random().toString(36).substring(2, 15);
      account.dateCreated = new Date().toISOString();
      account.refreshTokens = [];

      accounts.push(account);
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      // display verification email message
      const verifyUrl = `${window.location.origin}/account/verify-email?token=${account.verificationToken}`;
      setTimeout(() => {
        alertService.info(
          `
                    <h4>Verification Email (Fake)</h4>
                    <p>Please click the link below to verify your email:</p>
                    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
                `,
          { keepAfterRouteChange: true, autoClose: false },
        );
      }, 100);

      return ok();
    }

    function verifyEmail() {
      const { token } = body;
      const account = accounts.find((x) => x.verificationToken === token);

      if (!account) return error('Verification failed');

      account.isVerified = true;
      account.verificationToken = undefined;
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      return ok();
    }

    function forgotPassword() {
      const { email } = body;
      const account = accounts.find((x) => x.email?.toLowerCase() === email.toLowerCase());

      if (!account) return error('Email not found');

      account.resetToken = Math.random().toString(36).substring(2, 15);
      account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      // display password reset email message
      const resetUrl = `${window.location.origin}/account/reset-password?token=${account.resetToken}`;
      setTimeout(() => {
        alertService.info(
          `
                    <h4>Password Reset Email (Fake)</h4>
                    <p>Please click the link below to reset your password:</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                `,
          { keepAfterRouteChange: true, autoClose: false },
        );
      }, 100);

      return ok();
    }

    function validateResetToken() {
      const { token } = body;
      const account = accounts.find(
        (x) => x.resetToken === token && new Date(x.resetTokenExpires!) > new Date(),
      );

      if (!account) return error('Invalid token');

      return ok();
    }

    function resetPassword() {
      const { token, password } = body;
      const account = accounts.find(
        (x) => x.resetToken === token && new Date(x.resetTokenExpires!) > new Date(),
      );

      if (!account) return error('Invalid token');

      account.password = password;
      account.resetToken = undefined;
      account.resetTokenExpires = undefined;
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      return ok();
    }

    function getAccounts() {
      if (!isAdmin()) return unauthorized();
      return ok(accounts.map((x) => basicDetails(x)));
    }

    function getAccountById() {
      const account = accounts.find((x) => x.id === idFromUrl());
      if (!account || (account.id !== currentAccount()?.id && !isAdmin())) return unauthorized();
      return ok(basicDetails(account));
    }

    function createAccount() {
      if (!isAdmin()) return unauthorized();

      const account = body;
      if (accounts.find((x) => x.email === account.email)) {
        return error('Email "' + account.email + '" is already registered');
      }

      account.id = newAccountId();
      account.dateCreated = new Date().toISOString();
      account.isVerified = true;
      account.refreshTokens = [];

      accounts.push(account);
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      return ok();
    }

    function updateAccount() {
      const params = body;
      const account = accounts.find((x) => x.id === idFromUrl());
      if (!account || (account.id !== currentAccount()?.id && !isAdmin())) return unauthorized();

      if (
        params.email &&
        params.email !== account.email &&
        accounts.find((x) => x.email === params.email)
      ) {
        return error('Email "' + params.email + '" is already registered');
      }

      if (!params.password) {
        delete params.password;
      }

      Object.assign(account, params);
      localStorage.setItem(accountsKey, JSON.stringify(accounts));

      return ok(basicDetails(account));
    }

    function deleteAccount() {
      const account = accounts.find((x) => x.id === idFromUrl());
      if (!account || (account.id !== currentAccount()?.id && !isAdmin())) return unauthorized();

      accounts = accounts.filter((x) => x.id !== idFromUrl());
      localStorage.setItem(accountsKey, JSON.stringify(accounts));
      return ok();
    }

    // helper functions

    function ok(body?: any) {
      return of(new HttpResponse({ status: 200, body }));
    }

    function error(message: string) {
      return throwError(() => ({ status: 400, error: { message } }));
    }

    function unauthorized() {
      return throwError(() => ({ status: 401, error: { message: 'Unauthorized' } }));
    }

    function basicDetails(account: Account) {
      const { id, title, firstName, lastName, email, role, dateCreated, isVerified } = account;
      return { id, title, firstName, lastName, email, role, dateCreated, isVerified };
    }

    function idFromUrl() {
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1];
    }

    function newAccountId() {
      return accounts.length
        ? (Math.max(...accounts.map((x) => parseInt(x.id!))) + 1).toString()
        : '1';
    }

    function generateJwtToken(account: Account) {
      const tokenPayload = {
        exp: Math.round(new Date(Date.now() + 15 * 60 * 1000).getTime() / 1000),
        id: account.id,
      };
      return `fake-jwt-token.${btoa(JSON.stringify(tokenPayload))}`;
    }

    function generateRefreshToken() {
      const token =
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `fakeRefreshToken=${token}; expires=${expires}; path=/`;
      return token;
    }

    function getRefreshToken() {
      const cookie = document.cookie.split(';').find((x) => x.includes('fakeRefreshToken'));
      return cookie?.split('=')[1];
    }

    function currentAccount() {
      const authHeader = headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer fake-jwt-token')) return null;

      const jwtToken = JSON.parse(atob(authHeader.split('.')[1]));
      return accounts.find((x) => x.id === jwtToken.id);
    }

    function isAdmin() {
      return currentAccount()?.role === Role.Admin;
    }
  }
}

export const fakeBackendProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: FakeBackendInterceptor,
  multi: true,
};
