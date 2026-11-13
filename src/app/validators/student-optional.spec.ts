import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { StudentForm } from '../pages/student/student-form/student-form';
import { studentOptionalRules } from './student-optional.validator';

describe('campos opcionales de matrícula', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] }));
  afterEach(() => TestBed.resetTestingModule());

  it('permite omitir cada dato y rechaza espacios o valores que exceden su límite', () => {
    const page = TestBed.createComponent(StudentForm).componentInstance;
    page.hasForeignDocument.setValue(true);
    for (const [key, rule] of Object.entries(studentOptionalRules)) {
      const control = page.studentForm.get(key)!;
      control.setValue('');
      expect(control.valid, key).toBe(true);
      control.setValue(' ');
      expect(control.invalid, key).toBe(true);
      control.setValue('x'.repeat(rule.max + 1));
      expect(control.hasError('maxlength'), key).toBe(true);
    }
  });

  it('acepta nombres geográficos reales y rechaza símbolos o números sin nombre', () => {
    const page = TestBed.createComponent(StudentForm).componentInstance;
    for (const key of ['birthDistrict', 'birthLocality', 'birthProvince', 'addressDistrict', 'addressLocality']) {
      const control = page.studentForm.get(key)!;
      for (const value of ['General Pueyrredón', '9 de Julio', 'Mar del Plata']) {
        control.setValue(value);
        expect(control.valid, key).toBe(true);
      }
      for (const value of ['123456', '***', '<script>']) {
        control.setValue(value);
        expect(control.invalid, key).toBe(true);
      }
    }
  });

  it('bloquea departamentos de más de 10 caracteres con un mensaje claro', () => {
    const page = TestBed.createComponent(StudentForm).componentInstance;
    page.apartment.setValue('12345678901');
    page.apartment.markAsTouched();
    expect(page.studentForm.invalid).toBe(true);
    expect(page.optionalFieldError('apartment')).toBe('Máximo 10 caracteres.');
    page.apartment.setValue('2A');
    expect(page.optionalFieldError('apartment')).toBe('');
  });

  it('valida grupo sanguíneo y desactiva documentos extranjeros ocultos', () => {
    const page = TestBed.createComponent(StudentForm).componentInstance;
    for (const value of ['A+', 'AB-', 'O+', '']) {
      page.bloodType.setValue(value);
      expect(page.bloodType.valid).toBe(true);
    }
    page.bloodType.setValue('cualquiera');
    expect(page.bloodType.invalid).toBe(true);
    page.hasForeignDocument.setValue(true);
    page.foreignDocumentNumber.setValue('###');
    expect(page.foreignDocumentNumber.invalid).toBe(true);
    page.hasForeignDocument.setValue(false);
    expect(page.foreignDocumentNumber.disabled).toBe(true);
  });
});
