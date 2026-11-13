import { describe, expect, it } from 'vitest';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { cuilValidator, notBlank, matchingPasswords, differentPassword } from './form.validator';
describe('reactive form validators', () => {
  it('accepts empty optional text and rejects whitespace until corrected', () => {
    const field = new FormControl('', [notBlank, Validators.maxLength(25)]);
    expect(field.valid).toBe(true);
    field.setValue('   ');
    expect(field.hasError('spaces')).toBe(true);
    field.setValue('San Martín');
    expect(field.valid).toBe(true);
    field.setValue('a'.repeat(26));
    expect(field.hasError('maxlength')).toBe(true);
  });
  it('validates exactly eleven CUIL digits without checking the control digit', () => {
    const field = new FormControl('', cuilValidator);
    expect(field.valid).toBe(true);
    field.setValue('20123456786');
    expect(field.valid).toBe(true);
    field.setValue('20123456780');
    expect(field.valid).toBe(true);
    field.setValue('2012345678');
    expect(field.hasError('cuil')).toBe(true);
    field.setValue('20123456786');
    expect(field.valid).toBe(true);
  });
  it('rechecks password confirmation when either field changes', () => {
    const form = new FormGroup({
      password: new FormControl('', Validators.required),
      confirm: new FormControl('', Validators.required)
    }, {
      validators: matchingPasswords('password', 'confirm')
    });
    expect(form.invalid).toBe(true);
    form.setValue({
      password: 'new-password',
      confirm: 'different'
    });
    expect(form.hasError('passwordMismatch')).toBe(true);
    form.controls.confirm.setValue('new-password');
    expect(form.valid).toBe(true);
    form.controls.password.setValue('another-password');
    expect(form.hasError('passwordMismatch')).toBe(true);
  });
  it('rejects reuse of the current password and clears the error on correction', () => {
    const form = new FormGroup({
      current: new FormControl('initial'),
      next: new FormControl('initial')
    }, {
      validators: differentPassword('current', 'next')
    });
    expect(form.hasError('passwordUnchanged')).toBe(true);
    form.controls.next.setValue('replacement');
    expect(form.valid).toBe(true);
  });
});
