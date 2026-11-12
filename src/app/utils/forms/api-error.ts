/** Lee ProblemDetail de Spring Boot 4 y formatos de error anteriores. */
export function apiErrorMessage(error: any, fallback: string): string {
  const body = error?.error;
  const detail = body?.detail || body?.message || body?.reason ||
    (typeof body === 'string' && body.length < 500 ? body : '');
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (error?.status === 409) return `${fallback}. Hay un conflicto con un registro existente o con una regla de vinculación.`;
  if (error?.status === 403) return 'No tenés permisos para realizar esta acción.';
  if (error?.status === 401) return 'Tu sesión venció. Volvé a iniciar sesión.';
  return `${fallback} (HTTP ${error?.status || 'sin conexión'}).`;
}
