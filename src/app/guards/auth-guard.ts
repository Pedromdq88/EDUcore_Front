import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// JWT es un comprobante de sesión; el backend sigue validando su firma, vigencia y permisos.
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token=sessionStorage.getItem('educore_access_token');
  const tenant=sessionStorage.getItem('current_institution_id');
  return token && tenant ? true : router.createUrlTree(['/login']);
};
