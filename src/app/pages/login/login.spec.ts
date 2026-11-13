import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { Login } from './login';
describe('Login', () => {
  beforeEach(async () => await TestBed.configureTestingModule({
    imports: [Login],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
  }).compileComponents());
  it('should render EduCore', () => {
    const fixture = TestBed.createComponent(Login);
    expect(fixture.componentInstance).toBeTruthy();
  });
  it('mantiene el formulario válido mientras navega tras autenticar', async () => {
    const login = TestBed.createComponent(Login).componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    login.institutionsLoading = false;
    login.loginForm.setValue({ institutionId: 'school', email: 'test@example.com', password: 'clave' });
    const keys = ['educore_access_token', 'current_user_email', 'current_user_role',
      'educore_requires_password_change', 'current_institution_id', 'current_institution_name'];
    const previousValues = keys.map(key => sessionStorage.getItem(key));
    try {
      login.handleLogin();
      http.expectOne('/api/v1/auth/login').flush({
        token: 'test-token', email: 'test@example.com', role: 'DIRECTOR', institutionId: 'school', requiresPasswordChange: false
      });
      expect(login.loading).toBe(true);
      expect(login.password.valid).toBe(true);
      expect(navigate).toHaveBeenCalled();
      await Promise.resolve();
      expect(login.error).toBe('');
      http.verify();
    } finally {
      keys.forEach((key, index) => {
        const value = previousValues[index];
        if (value === null) sessionStorage.removeItem(key);
        else sessionStorage.setItem(key, value);
      });
      navigate.mockRestore();
    }
  });
});
