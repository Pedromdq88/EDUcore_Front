import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { clearLocalSession } from '../guards/session';
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/v1/'))
    return next(request);
  const publicRequest = /^\/api\/v1\/(?:public\/|auth\/(?:login|forgot-password|verify-reset-code|reset-password)(?:\?|$))/.test(request.url);
  if (publicRequest)
    return next(request);
  const token = sessionStorage.getItem('educore_access_token');
  const institution = sessionStorage.getItem('current_institution_id');
  const headers: Record<string, string> = {};
  if (token)
    headers['Authorization'] = `Bearer ${token}`;
  if (institution)
    headers['X-Institution-Id'] = institution;
  const authenticated = Object.keys(headers).length ? request.clone({
    setHeaders: headers
  }) : request;
  const router = inject(Router);
  return next(authenticated).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401 && token) {
      clearLocalSession();
      if (!router.url.startsWith('/login'))
        void router.navigate(['/login']);
    }
    return throwError(() => error);
  }));
};
