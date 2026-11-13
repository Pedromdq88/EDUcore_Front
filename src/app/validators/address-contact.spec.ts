import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { StudentForm } from '../pages/student/student-form/student-form';
import { FeeList } from '../pages/fee/fee-list/fee-list';

describe('domicilio opcional y verificación de correos', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
  }));
  afterEach(() => {
    try {
      TestBed.inject(HttpTestingController).verify();
    } finally {
      TestBed.resetTestingModule();
    }
  });

  it('permite omitir el domicilio pero valida cada campo completado', () => {
    const page = TestBed.createComponent(StudentForm).componentInstance;
    for (const key of ['street', 'streetNumber', 'floor', 'tower', 'apartment', 'betweenStreets', 'addressDistrict', 'addressLocality', 'otherAddressDetails']) {
      const control = page.studentForm.get(key)!;
      control.setValue('');
      expect(control.valid, key).toBe(true);
      for (const value of [' ', '@@@', '<dato>', '1'.repeat(26)]) {
        control.setValue(value);
        expect(control.invalid, key + ': ' + value).toBe(true);
      }
    }
    for (const value of ['S/N', '123 bis', '123A']) {
      page.streetNumber.setValue(value);
      expect(page.streetNumber.valid).toBe(true);
    }
    for (const value of ['PB', '2º', '-1', 'EP']) {
      page.floor.setValue(value);
      expect(page.floor.valid).toBe(true);
    }
    page.addressLocality.setValue('9 de Julio');
    expect(page.addressLocality.valid).toBe(true);
  });

  it('muestra el destino únicamente cuando el servidor confirma el envío', () => {
    const page = TestBed.createComponent(FeeList).componentInstance;
    const http = TestBed.inject(HttpTestingController);
    page.receiptEmail.setValue('nuevo@example.com');
    page.requestEmailVerification('receiptEmail');
    expect(page.emailVerificationMessage).toBe('');
    const request = http.expectOne('/api/v1/verify-contact-email/request');
    expect(request.request.body.email).toBe('nuevo@example.com');
    request.flush({ message: 'Enviado' });
    expect(page.emailVerificationMessage).toContain('El código fue enviado a nuevo@example.com');
    expect(page.emailVerificationBusy).toBe(false);
    expect(page.isEmailVerified('receiptEmail')).toBe(false);
    page.receiptEmail.setValue('otro@example.com');
    expect(page.emailVerificationMessage).toBe('');
  });

  it('muestra errores de dominio y envío sin anunciar un código enviado', () => {
    const page = TestBed.createComponent(FeeList).componentInstance;
    const http = TestBed.inject(HttpTestingController);
    page.feeQueryEmail.setValue('nuevo@example.com');
    for (const status of [400, 503]) {
      page.requestEmailVerification('feeQueryEmail');
      const message = status === 400 ? 'El dominio del correo no existe o no recibe mensajes.' : 'No se pudo enviar el correo de verificación.';
      http.expectOne('/api/v1/verify-contact-email/request').flush({ message }, { status, statusText: 'Error' });
      expect(page.error).toBe(message);
      expect(page.emailVerificationMessage).toBe('');
      expect(page.emailVerificationBusy).toBe(false);
    }
  });
});
