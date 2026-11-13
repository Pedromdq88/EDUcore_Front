export const validEmail = (raw: string | null | undefined): boolean => {
  const email = (raw ?? '').trim();
  return email.length <= 30 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
export const validNumericDni = (raw: string | null | undefined): boolean => /^[0-9]{6,8}$/.test(String(raw ?? '').trim());
export const validNumericPhone = (raw: string | null | undefined): boolean => {
  const phone = String(raw ?? '').trim();
  return !phone || /^[0-9]{6,20}$/.test(phone);
};
export const normalizedEmail = (raw: string): string => raw.trim().toLowerCase();
export const validDni = (raw: string | null | undefined): boolean => {
  const value = (raw ?? '').trim();
  return /^[0-9.\- ]+$/.test(value) && /^\d{6,8}$/.test(value.replace(/\D/g, ''));
};
export const validPersonName = (raw: string | null | undefined): boolean => {
  const name = (raw ?? '').trim();
  return name.length >= 2 && name.length <= 20 &&
    /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/.test(name);
};
export const validOptionalText = (raw: string | null | undefined, max = 255): boolean => {
  const text = raw ?? '';
  return text.length <= max && (text.length === 0 || text.trim().length > 0);
};
export const validLegajo = (raw: string | null | undefined): boolean => {
  const legajo = (raw ?? '').trim();
  return !legajo || /^[A-Za-z0-9][A-Za-z0-9._/-]{0,49}$/.test(legajo);
};
export const validCuil = (raw: string | null | undefined): boolean => {
  const value = raw ?? '';
  return value === '' || /^[0-9]{11}$/.test(value);
};
