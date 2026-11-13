import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { FormControl } from '@angular/forms';
import { StudentForm } from '../pages/student/student-form/student-form';
import { StudentRecords } from '../pages/student-records/student-records';
import { StudentService } from '../services/student/student';
import { TutorForm } from '../pages/tutor/tutor-form/tutor-form';
import { TutorModal } from '../components/tutor-modal/tutor-modal';
import { Calendar } from '../pages/calendar/calendar';
import { ageRange } from './form.validator';
describe('límites solicitados por módulo', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideRouter([])]
  }));
  afterEach(() => TestBed.resetTestingModule());
  it('rechaza folios largos y envía como null la fecha judicial sin informar', () => {
    const records = TestBed.createComponent(StudentRecords).componentInstance;
    const api = TestBed.inject(StudentService);
    vi.spyOn(records, 'canEdit', 'get').mockReturnValue(true);
    vi.spyOn(records, 'load').mockImplementation(() => {});
    vi.spyOn(api, 'getAuthorizedPickups').mockReturnValue(of([]));
    const save = vi.spyOn(api, 'createJudicialRestriction').mockReturnValue(of({}));
    records.selectedId = 'student';
    records.restrictionForm.patchValue({
      firstName: 'Ana', lastName: 'Pérez', documentNumber: '12345678',
      description: 'Restricción de retiro', folioNumber: '1'.repeat(51)
    });
    records.saveRestriction();
    expect(records.restrictionFolioNumber.hasError('maxlength')).toBe(true);
    expect(save).not.toHaveBeenCalled();
    records.restrictionFolioNumber.setValue('12-A');
    records.restrictionInscriptionDate.setValue('2026-02-30');
    expect(records.restrictionInscriptionDate.hasError('inscriptionDate')).toBe(true);
    records.restrictionInscriptionDate.setValue('');
    records.saveRestriction();
    expect(save).toHaveBeenCalledWith('student', expect.objectContaining({
      folioNumber: '12-A', inscriptionDate: null
    }));
    expect(records.message).toBe('Restricción judicial guardada.');
  });
  it('respeta los límites de cada columna de domicilio y ambos teléfonos a 20', () => {
    const form = TestBed.createComponent(StudentForm).componentInstance.studentForm;
    for (const [key, max, valid] of [
      ['street', 25, 'a'.repeat(25)],
      ['streetNumber', 20, '123456 bis'],
      ['floor', 10, '2º'],
      ['tower', 20, 'a'.repeat(20)],
      ['apartment', 10, '1'.repeat(10)],
      ['betweenStreets', 25, 'a'.repeat(25)],
      ['addressDistrict', 25, 'a'.repeat(25)],
      ['addressLocality', 25, 'a'.repeat(25)],
      ['otherAddressDetails', 25, 'a'.repeat(25)]
    ] as const) {
      const control = form.get(key)!;
      control.setValue(valid);
      expect(control.valid, key).toBe(true);
      control.setValue('1'.repeat(max + 1));
      expect(control.hasError('maxlength'), key).toBe(true);
    }
    for (const key of ['studentLandlinePhone', 'studentCellphone']) {
      const control = form.get(key)!;
      for (const valid of ['', '123456', '1'.repeat(20)]) {
        control.setValue(valid);
        expect(control.valid).toBe(true);
      }
      for (const invalid of ['12345', '1'.repeat(21), '12345a', '+123456']) {
        control.setValue(invalid);
        expect(control.invalid).toBe(true);
      }
    }
    form.get('cuil')!.setValue('20123456780');
    expect(form.get('cuil')!.valid).toBe(true);
    form.get('cuil')!.setValue('2012345678');
    expect(form.get('cuil')!.invalid).toBe(true);
    form.get('legajoNumber')!.setValue('Legajo provisorio 01');
    expect(form.get('legajoNumber')!.valid).toBe(true);
    form.get('legajoNumber')!.setValue('a'.repeat(51));
    expect(form.get('legajoNumber')!.hasError('maxlength')).toBe(true);
  });
  it('aplica las mismas reglas al tutor normal y al rápido', () => {
    const normal = TestBed.createComponent(TutorForm).componentInstance.tutorForm;
    const quick = TestBed.createComponent(TutorModal).componentInstance.tutorForm;
    for (const key of [
      'firstName',
      'lastName',
      'documentNumber',
      'email',
      'phone',
      'direccion',
      'nacionalidad',
      'profesion',
      'condicionActividad'
    ]) {
      for (const value of [
        '',
        ' ',
        'Ana',
        '123456',
        'Ana123',
        'a'.repeat(21),
        '1'.repeat(20),
        '1'.repeat(21),
        'a'.repeat(256),
        'correo@escuela.edu.ar'
      ]) {
        normal.get(key)!.setValue(value);
        quick.get(key)!.setValue(value);
        expect(quick.get(key)!.errors, key + ': ' + value).toEqual(normal.get(key)!.errors);
      }
    }
  });
  it('separa nombre/apellido de retiro y limita textos médicos', () => {
    const records = TestBed.createComponent(StudentRecords).componentInstance;
    for (const field of [records.pickupFirstName, records.pickupLastName]) {
      field.setValue('a'.repeat(20));
      expect(field.valid).toBe(true);
      field.setValue('a'.repeat(21));
      expect(field.invalid).toBe(true);
      field.setValue('Ana1');
      expect(field.invalid).toBe(true);
    }
    records.medicalObraSocial.setValue('a'.repeat(11));
    expect(records.medicalObraSocial.hasError('maxlength')).toBe(true);
    records.medicalObraSocial.setValue('Sí');
    expect(records.medicalObraSocial.valid).toBe(true);
    records.medicalNroAfiliado.setValue('AB-123/4');
    expect(records.medicalNroAfiliado.valid).toBe(true);
    records.medicalNroAfiliado.setValue('###');
    expect(records.medicalNroAfiliado.hasError('pattern')).toBe(true);
    for (const field of [
      records.medicalDetalleInternacion,
      records.medicalMotivoOperacion,
      records.medicalCualMedicacion
    ]) {
      field.setValue('a'.repeat(4000));
      expect(field.valid).toBe(true);
      field.setValue('a'.repeat(4001));
      expect(field.hasError('maxlength')).toBe(true);
    }
    records.openPickup({
      fullName: 'Ana María Pérez',
      documentNumber: '12345678'
    });
    expect(records.pickupFirstName.value + ' ' + records.pickupLastName.value).toBe('Ana María Pérez');
  });
  it('acepta 18 y 80 años y rechaza edades fuera de rango y fechas imposibles', () => {
    const today = new Date();
    const date = (age: number) => String(today.getFullYear() - age) + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const field = new FormControl('', ageRange(18));
    for (const age of [18, 80]) {
      field.setValue(date(age));
      expect(field.valid).toBe(true);
    }
    for (const age of [17, 81]) {
      field.setValue(date(age));
      expect(field.invalid).toBe(true);
    }
    field.setValue('2000-02-30');
    expect(field.invalid).toBe(true);
  });
  it('detecta choques de aula/docente, permite horarios contiguos y editar el propio registro', () => {
    const calendar = TestBed.createComponent(Calendar).componentInstance;
    calendar.schedules.set([{
      id: 'one',
      classroomId: 'room',
      subject: 'Música',
      teacherName: 'Ana',
      dayOfWeek: 1,
      startTime: '08:00:00',
      endTime: '09:00:00'
    }]);
    calendar.scheduleForm.setValue({
      classroomId: 'room',
      subject: 'Arte',
      teacherName: 'Luis',
      dayOfWeek: 1,
      startTime: '08:30',
      endTime: '09:30'
    });
    expect(calendar.scheduleForm.hasError('overlap')).toBe(true);
    calendar.classroomId.setValue('other');
    expect(calendar.scheduleForm.hasError('overlap')).toBe(false);
    calendar.teacherName.setValue(' ana ');
    expect(calendar.scheduleForm.hasError('overlap')).toBe(true);
    calendar.startTime.setValue('09:00');
    expect(calendar.scheduleForm.hasError('overlap')).toBe(false);
    calendar.editingScheduleId = 'one';
    calendar.startTime.setValue('08:30');
    expect(calendar.scheduleForm.hasError('overlap')).toBe(false);
  });
});
