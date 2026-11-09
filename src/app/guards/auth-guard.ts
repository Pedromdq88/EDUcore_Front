import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { getMultiTenantHeaders } from '../services/tenant/tenant';
import { landingFor } from './roles';

/** La autorización efectiva se aplica en Spring Security. La guarda evita sesiones caducadas. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const token = sessionStorage.getItem('educore_access_token');
  const tenant = sessionStorage.getItem('current_institution_id');
  const redirect = () => router.createUrlTree(['/login']);
  if (!token || !tenant) return redirect();
  return http.get<{email:string;role:string;institutionId:string;requiresPasswordChange:boolean}>(
    'http://localhost:8080/api/v1/auth/me', {headers: getMultiTenantHeaders()}
  ).pipe(map((profile: {email:string;role:string;institutionId:string;requiresPasswordChange:boolean}) => {
    if (profile.institutionId !== tenant) return redirect();
    sessionStorage.setItem('current_user_role', profile.role);
    sessionStorage.setItem('current_user_email', profile.email);
    sessionStorage.setItem('educore_requires_password_change',String(!!profile.requiresPasswordChange));
    if(profile.requiresPasswordChange && !state.url.startsWith('/change-password'))return router.createUrlTree(['/change-password']);
    if(!profile.requiresPasswordChange && state.url.startsWith('/change-password'))return router.createUrlTree([landingFor(profile.role)]);
    const allowed = _route.data['roles'] as readonly string[] | undefined;
    if (allowed && !allowed.includes(profile.role)) return router.createUrlTree([landingFor(profile.role)]);
    return true;
  }), catchError(() => {
    for(const key of ['educore_access_token','current_user_role','current_user_email','current_institution_id','current_institution_name','educore_requires_password_change']) sessionStorage.removeItem(key);
    return of(redirect());
  }));
};
