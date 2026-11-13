import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MyStaff } from '../pages/my-staff/my-staff';
import { StudentForm } from '../pages/student/student-form/student-form';
import { StudentService } from '../services/student/student';
import { can } from '../guards/roles';
import { PasswordRecovery } from '../pages/password-recovery/password-recovery';
describe('integración de la nueva versión', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
  }));
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });
  const profile = {
    id: 'staff',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@escuela.com',
    role: 'DIRECTOR',
    phone: '12345678',
    documentNumber: '12345678',
    hireDate: '2020-03-01',
    classroom: 'Sala 3',
    assignments: []
  };
  it('conserva el acceso ampliado al perfil personal', () => {
    for (const role of ['DIRECTOR', 'ADMINISTRATIVE', 'PRECEPTOR', 'TEACHER'])
      expect(can(role, 'my-profile')).toBe(true);
    expect(can('TUTOR', 'my-profile')).toBe(false);
  });
  it('carga el perfil y los portfolios desde los endpoints nuevos', () => {
    const page = TestBed.createComponent(MyStaff).componentInstance;
    const http = TestBed.inject(HttpTestingController);
    page.ngOnInit();
    http.expectOne('/api/v1/profile/staff').flush(profile);
    http.expectOne('/api/v1/profile/staff/portfolios').flush([]);
    expect(page.canManagePortfolio).toBe(true);
    expect(page.profile()?.id).toBe('staff');
  });
  it('mantiene las validaciones de nombre y la edición de datos personales', () => {
    const page = TestBed.createComponent(MyStaff).componentInstance;
    page.profile.set(profile);
    page.startPersonalEdit();
    page.firstName.setValue('a'.repeat(21));
    page.savePersonal();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/profile/staff');
    page.firstName.setValue('Ana1');
    expect(page.firstName.invalid).toBe(true);
    page.firstName.setValue('Ana María');
    page.savePersonal();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/profile/staff');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.firstName).toBe('Ana María');
    request.flush({
      ...profile,
      firstName: 'Ana María'
    });
    expect(page.editingPersonal).toBe(false);
  });
  it('distingue un endpoint ausente de una cuenta sin acceso al perfil', () => {
    const page = TestBed.createComponent(MyStaff).componentInstance;
    const http = TestBed.inject(HttpTestingController);
    page.ngOnInit();
    http.expectOne('/api/v1/profile/staff').flush({}, { status: 404, statusText: 'Not Found' });
    expect(page.error).toContain('reiniciá el backend');
    expect(page.loading).toBe(false);
    page.ngOnInit();
    http.expectOne('/api/v1/profile/staff').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(page.error).toContain('legajo activo');
    http.expectNone('/api/v1/profile/staff/portfolios');
  });
  it('deshabilita el aula durante la consulta y la habilita al recibir opciones', () => {
    const page = TestBed.createComponent(StudentForm).componentInstance;
    const response = new Subject<any>();
    vi.spyOn(TestBed.inject(StudentService), 'getClassroomOptions').mockReturnValue(response);
    expect(page.classroom.disabled).toBe(true);
    page.birthDate.setValue('2023-01-01');
    page.academicYear.setValue(2026);
    page.refreshClassrooms();
    expect(page.classroom.disabled).toBe(true);
    response.next({ options: [{ id: 'room', name: 'Sala 3' }] });
    expect(page.classroom.enabled).toBe(true);
    expect(page.studentForm.getRawValue().classroom).toBe('Sala 3');
    page.birthDate.setValue('2099-01-01');
    page.refreshClassrooms();
    expect(page.classroom.disabled).toBe(true);
    expect(page.canSubmit).toBe(false);
    response.complete();
  });
  it('bloquea la recuperación mientras está ocupada sin perder valores ni validadores', () => {
    const page = TestBed.createComponent(PasswordRecovery).componentInstance;
    TestBed.tick();
    expect(page.institutionId.disabled).toBe(true);
    TestBed.inject(HttpTestingController).expectOne('/api/v1/public/institutions').flush([]);
    page.email.setValue('ana@escuela.com');
    page.busy.set(true);
    TestBed.tick();
    expect(page.email.disabled).toBe(true);
    expect(page.email.value).toBe('ana@escuela.com');
    page.busy.set(false);
    TestBed.tick();
    expect(page.email.enabled).toBe(true);
    expect(page.institutionId.enabled).toBe(true);
    page.email.setValue('incorrecto');
    expect(page.email.invalid).toBe(true);
  });
  it('rechaza portfolios inválidos y usa el endpoint personal para guardar', () => {
    const page = TestBed.createComponent(MyStaff).componentInstance;
    page.profile.set(profile);
    page.startPortfolio();
    page.portfolioForm.patchValue({
      title: ' ',
      description: 'Descripción',
      category: 'CURSO',
      activityDate: '2026-11-12'
    });
    page.savePortfolio();
    expect(page.title.invalid).toBe(true);
    TestBed.inject(HttpTestingController).expectNone('/api/v1/profile/staff/portfolios');
    page.title.setValue('a'.repeat(255));
    page.description.setValue('a'.repeat(5001));
    expect(page.description.hasError('maxlength')).toBe(true);
    page.description.setValue('a'.repeat(5000));
    page.savePortfolio();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('/api/v1/profile/staff/portfolios');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.title.length).toBe(255);
    request.flush({
      id: 'portfolio'
    });
    http.expectOne('/api/v1/profile/staff/portfolios').flush([]);
  });
  it('conserva candidatos a hermanos y elimina el teléfono de contacto duplicado', () => {
    const page = TestBed.createComponent(StudentForm).componentInstance;
    page.editingId = 'one';
    page.tutorOne = 'tutor';
    page.existingStudents.set([
      {
        id: 'one',
        tutors: [{
          id: 'tutor'
        }]
      },
      {
        id: 'two',
        tutors: [{
          id: 'tutor'
        }]
      },
      {
        id: 'three',
        tutors: [{
          id: 'other'
        }]
      }
    ] as any);
    expect(page.possibleSiblings.map(s => s.id)).toEqual(['two']);
    expect(page.studentForm.contains('contactPhone')).toBe(false);
    page.streetNumber.setValue('a'.repeat(26));
    expect(page.streetNumber.hasError('maxlength')).toBe(true);
  });
  it('conserva consulta, confirmación y eliminación de vínculos familiares', () => {
    const service = TestBed.inject(StudentService), http = TestBed.inject(HttpTestingController);
    service.getSiblingOptions('one').subscribe();
    http.expectOne('/api/v1/students/one/siblings').flush({
      confirmed: [],
      candidates: []
    });
    service.confirmSibling('one', 'two').subscribe();
    const post = http.expectOne('/api/v1/students/one/siblings/two');
    expect(post.request.method).toBe('POST');
    post.flush(null);
    service.removeSibling('one', 'two').subscribe();
    const del = http.expectOne('/api/v1/students/one/siblings/two');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
  });
});
