import { describe, expect, it } from 'vitest';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { integer, pastOrCurrentYear, timeOfDay, scheduleOrder, siblingCounts } from './form.validator';
import { Calendar } from '../pages/calendar/calendar';
import { StudentForm } from '../pages/student/student-form/student-form';
describe('validación de secciones', () => {
  it.each([0, 1, 2026, '2026', '', null])('acepta entero o vacío opcional: %s', value => {
    expect(new FormControl(value, integer).valid).toBe(true);
  });
  it.each([1.5, '2.5', 'abc', ' ', Infinity, NaN, true])('rechaza valores no enteros: %s', value => {
    expect(new FormControl(value, integer).hasError('integer')).toBe(true);
  });
  it('conserva required y los límites numéricos', () => {
    const field = new FormControl<number | null>(null, [integer, Validators.required, Validators.min(0), Validators.max(30)]);
    expect(field.hasError('required')).toBe(true);
    field.setValue(-1);
    expect(field.hasError('min')).toBe(true);
    field.setValue(31);
    expect(field.hasError('max')).toBe(true);
  });
  it('mantiene opcional el año y rechaza formatos inválidos o años futuros', () => {
    const field = new FormControl('', pastOrCurrentYear);
    expect(field.valid).toBe(true);
    for (const value of ['0000', '20', 'abcd', '2020.5', String(new Date().getFullYear() + 1)]) {
      field.setValue(value);
      expect(field.hasError('year')).toBe(true);
    }
    field.setValue(String(new Date().getFullYear()));
    expect(field.valid).toBe(true);
    field.setValue('2019');
    expect(field.valid).toBe(true);
  });
  it('valida horas reales, segundos del backend y el orden', () => {
    const form = new FormGroup({
      startTime: new FormControl('08:00', timeOfDay),
      endTime: new FormControl('09:00:00', timeOfDay)
    }, {
      validators: scheduleOrder
    });
    expect(form.valid).toBe(true);
    form.controls.endTime.setValue('08:00:00');
    expect(form.hasError('timeOrder')).toBe(true);
    form.controls.endTime.setValue('07:59');
    expect(form.hasError('timeOrder')).toBe(true);
    form.controls.endTime.setValue('25:00');
    expect(form.controls.endTime.hasError('time')).toBe(true);
    form.controls.endTime.setValue('08:00:01');
    expect(form.valid).toBe(true);
  });
  it('revalida hermanos cuando cambia cualquiera de las cantidades', () => {
    const form = new FormGroup({
      siblingCount: new FormControl(1, integer),
      siblingsInThisSchool: new FormControl(2, integer)
    }, {
      validators: siblingCounts
    });
    expect(form.hasError('siblingCounts')).toBe(true);
    form.controls.siblingCount.setValue(2);
    expect(form.valid).toBe(true);
    form.controls.siblingsInThisSchool.setValue(3);
    expect(form.invalid).toBe(true);
    form.controls.siblingsInThisSchool.setValue(0);
    expect(form.valid).toBe(true);
  });
  it('conecta los validadores con los formularios reales de calendario y alumnos', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])]
    });
    const calendar = TestBed.createComponent(Calendar).componentInstance;
    calendar.eventTitle.setValue('   ');
    expect(calendar.eventTitle.hasError('spaces')).toBe(true);
    calendar.scheduleForm.patchValue({
      startTime: '10:00',
      endTime: '09:00'
    });
    expect(calendar.scheduleForm.hasError('timeOrder')).toBe(true);
    calendar.endTime.setValue('11:00');
    expect(calendar.scheduleForm.hasError('timeOrder')).toBe(false);
    const student = TestBed.createComponent(StudentForm).componentInstance;
    student.siblingCount.setValue(1);
    student.siblingsInThisSchool.setValue(2);
    expect(student.studentForm.hasError('siblingCounts')).toBe(true);
    student.siblingCount.setValue(2);
    expect(student.studentForm.hasError('siblingCounts')).toBe(false);
    TestBed.resetTestingModule();
  });
});
