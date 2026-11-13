import { ValidatorFn, Validators } from '@angular/forms';
import { validCuil } from './identity.validator';
export const notBlank: ValidatorFn = control => typeof control.value === 'string' && control.value.length > 0 && !control.value.trim()
  ? {
    spaces: true
  } : null;
export const cuilValidator: ValidatorFn = control => validCuil(control.value) ? null : {
  cuil: true
};
export function matchingPasswords(password: string, confirmation: string): ValidatorFn {
  return group => {
    const value = group.get(password)?.value;
    const repeated = group.get(confirmation)?.value;
    return value && repeated && value !== repeated ? {
      passwordMismatch: true
    } : null;
  };
}
export function differentPassword(current: string, next: string): ValidatorFn {
  return group => {
    const value = group.get(next)?.value;
    return value && value === group.get(current)?.value ? {
      passwordUnchanged: true
    } : null;
  };
}
export const integer: ValidatorFn = control => {
  const value = control.value;
  if (value === null || value === undefined || value === '')
    return null;
  return (typeof value === 'number' || typeof value === 'string') &&
    String(value).trim() !== '' && Number.isInteger(Number(value))
    ? null : {
      integer: true
    };
};
export const pastOrCurrentYear: ValidatorFn = control => {
  const value = control.value;
  if (value === null || value === undefined || value === '')
    return null;
  return /^[1-9][0-9]{3}$/.test(String(value)) && Number(value) <= new Date().getFullYear()
    ? null : {
      year: true
    };
};
export const timeOfDay: ValidatorFn = control => {
  if (!control.value)
    return null;
  return /^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(String(control.value))
    ? null : {
      time: true
    };
};
export const scheduleOrder: ValidatorFn = group => {
  const start = group.get('startTime');
  const end = group.get('endTime');
  if (!start?.value || !end?.value || start.invalid || end.invalid)
    return null;
  return String(start.value).padEnd(8, ':00') < String(end.value).padEnd(8, ':00')
    ? null : {
      timeOrder: true
    };
};
export const siblingCounts: ValidatorFn = group => {
  const total = group.get('siblingCount');
  const inSchool = group.get('siblingsInThisSchool');
  if (!total || !inSchool || total.invalid || inSchool.invalid ||
    total.value === null || total.value === '' || inSchool.value === null || inSchool.value === '')
    return null;
  return Number(inSchool.value) <= Number(total.value) ? null : {
    siblingCounts: true
  };
};
export const personNameValidators = [
  Validators.required,
  Validators.maxLength(20),
  Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/)
];
export function ageRange(min: number, max = 80): ValidatorFn {
  return control => {
    if (!control.value)
      return null;
    const value = String(control.value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      return {
        age: true
      };
    const [year, month, day] = value.split('-').map(Number);
    const born = new Date(year, month - 1, day);
    const today = new Date();
    if (born.getFullYear() !== year || born.getMonth() !== month - 1 || born.getDate() !== day || born > today)
      return {
        age: true
      };
    const age = today.getFullYear() - year - (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day) ? 1 : 0);
    return age >= min && age <= max ? null : {
      age: true
    };
  };
}
