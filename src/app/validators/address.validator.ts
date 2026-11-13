import { Validators } from '@angular/forms';
import { notBlank } from './form.validator';

export const addressTextValidators = [
  notBlank,
  Validators.maxLength(25),
  Validators.pattern(/^(?=.*[\p{L}0-9])[\p{L}\p{M}0-9 .,'’º°ª()/#:&-]+$/u)
];

export const streetNumberValidators = [
  notBlank,
  Validators.maxLength(25),
  Validators.pattern(/^ *(?:[0-9]+(?: *[a-z]| *bis)?|s\/?n|sin n[uú]mero) *$/i)
];

export const floorValidators = [
  notBlank,
  Validators.maxLength(25),
  Validators.pattern(/^ *(?:-?[0-9]+(?:[º°ª]|er|do|to)?|p\.?b\.?|ss|ep|planta baja|subsuelo|entrepiso) *$/i)
];
