/** Reglas de formato de la interfaz. El backend vuelve a comprobar todo. */
export const validEmail = (raw: string | null | undefined): boolean => {
  const email = (raw ?? '').trim();
  return email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/** DNI físicos: solo dígitos, entre 6 y 12 caracteres. */
export const validNumericDni = (raw: string | null | undefined): boolean =>
  /^[0-9]{6,12}$/.test(String(raw ?? '').trim());

/** Teléfono opcional, sin prefijo + ni separadores: números solamente. */
export const validNumericPhone = (raw: string | null | undefined): boolean => {
  const phone = String(raw ?? '').trim();
  return !phone || /^[0-9]{6,20}$/.test(phone);
};

export const normalizedEmail = (raw: string): string => raw.trim().toLowerCase();

/** DNI numérico para legajos que requieren documento, no para trámites pendientes. */
export const validDni = (raw: string | null | undefined): boolean => {
  const value = (raw ?? '').trim();
  return /^[0-9.\- ]+$/.test(value) && /^\d{6,12}$/.test(value.replace(/\D/g, ''));
};
