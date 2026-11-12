import { describe, expect, it } from 'vitest';
import { validDni, validEmail, normalizedEmail } from './identity.validator';

describe('validaciones de identidad', () => {
  it('rechaza correos vacíos o inválidos', () => {
    expect(validEmail('')).toBe(false);
    expect(validEmail('correo-invalido')).toBe(false);
    expect(validEmail('usuario@escuela.edu.ar')).toBe(true);
  });
  it('normaliza el correo sin alterar el dominio', () => {
    expect(normalizedEmail('  TUTOR@Escuela.edu.ar  ')).toBe('tutor@escuela.edu.ar');
  });
  it('valida DNI y separadores comunes', () => {
    expect(validDni('12.345.678')).toBe(true);
    expect(validDni('')).toBe(false);
    expect(validDni('ABC123')).toBe(false);
  });
});
