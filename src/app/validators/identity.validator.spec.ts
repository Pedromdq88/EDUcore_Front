import { describe, expect, it } from 'vitest';
import { validDni, validNumericDni, validEmail, normalizedEmail } from './identity.validator';
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
    expect(validDni('123.456.789')).toBe(false);
  });
  it('acepta DNI de 6 a 8 números y rechaza valores fuera del límite', () => {
    for (const value of ['123456', '1234567', '12345678'])
      expect(validNumericDni(value)).toBe(true);
    for (const value of ['12345', '123456789', '123456789012', '1234567a', '12.345.678'])
      expect(validNumericDni(value)).toBe(false);
  });
});
