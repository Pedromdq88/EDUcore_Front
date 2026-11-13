export const SESSION_KEYS = [
  'educore_access_token',
  'current_user_role',
  'current_user_email',
  'current_institution_id',
  'current_institution_name',
  'educore_requires_password_change'
] as const;
export function clearLocalSession(): void {
  for (const key of SESSION_KEYS)
    sessionStorage.removeItem(key);
}
