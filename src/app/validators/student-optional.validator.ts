import { Validators } from '@angular/forms';
import { notBlank } from './form.validator';

const place = /^(?=.*[\p{L}])[\p{L}\p{M}0-9 .,'’-]+$/u;
const words = /^(?=.*[\p{L}])[\p{L}\p{M} .,'’/-]+$/u;
const address = /^(?=.*[\p{L}0-9])[\p{L}\p{M}0-9 .,'’º°ª()/#:&-]+$/u;
const reference = /^(?=.*[\p{L}0-9])[\p{L}\p{M}0-9 ./#_-]+$/u;
const summary = /^(?=.*[\p{L}0-9])[\p{L}\p{M}0-9 .,'’º°ª()/#:&+%_-]+$/u;
const rule = (max: number, pattern: RegExp, hint: string) => ({
  max,
  hint,
  validators: [notBlank, Validators.maxLength(max), Validators.pattern(pattern)]
});

export const studentOptionalRules = {
  legajoNumber: rule(50, reference, 'Hasta 50 caracteres: letras, números, espacios, punto, guion o barra.'),
  cuil: rule(11, /^[0-9]{11}$/, 'Exactamente 11 números, sin guiones.'),
  foreignDocumentType: rule(20, words, 'Hasta 20 caracteres: letras y separadores. Ej.: Pasaporte.'),
  foreignDocumentNumber: rule(20, /^[A-Za-z0-9]+(?:[ .\/-][A-Za-z0-9]+)*$/, 'Hasta 20 caracteres: letras, números, punto, guion o barra.'),
  nationality: rule(25, words, 'Hasta 25 caracteres: letras, espacios, guiones o barra.'),
  birthProvince: rule(25, place, 'Hasta 25 caracteres; debe contener letras. Ej.: Buenos Aires.'),
  birthDistrict: rule(25, place, 'Hasta 25 caracteres; debe contener letras. Ej.: General Pueyrredón.'),
  birthLocality: rule(25, place, 'Hasta 25 caracteres; debe contener letras. Ej.: 9 de Julio.'),
  street: rule(25, address, 'Hasta 25 caracteres: letras, números y signos de domicilio. Ej.: Av. Colón.'),
  streetNumber: rule(20, /^ *(?:[0-9]{1,6}(?: *[a-z]| *bis)?|s\/?n|sin n[uú]mero) *$/i, 'Hasta 20 caracteres. Número de hasta 6 dígitos, 123 bis o S/N.'),
  floor: rule(10, /^ *(?:-?[0-9]{1,2}(?:[º°ª]|er|do|to)?|p\.?b\.?|ss|ep|subsuelo|entrepiso) *$/i, 'Hasta 10 caracteres. Ej.: 2, -1, PB, SS o EP.'),
  tower: rule(20, address, 'Hasta 20 caracteres: letras, números y separadores. Ej.: Torre A.'),
  apartment: rule(10, reference, 'Hasta 10 caracteres: letras, números y separadores. Ej.: 2A.'),
  betweenStreets: rule(25, address, 'Hasta 25 caracteres. Ej.: San Martín y 25 de Mayo.'),
  addressDistrict: rule(25, place, 'Hasta 25 caracteres; debe contener letras. Ej.: General Pueyrredón.'),
  addressLocality: rule(25, place, 'Hasta 25 caracteres; debe contener letras. Ej.: Mar del Plata.'),
  otherAddressDetails: rule(25, address, 'Hasta 25 caracteres: una referencia breve del domicilio.'),
  studentLandlinePhone: rule(20, /^[0-9]{6,20}$/, 'Entre 6 y 20 números, sin espacios, guiones ni +.'),
  studentCellphone: rule(20, /^[0-9]{6,20}$/, 'Entre 6 y 20 números, sin espacios, guiones ni +.'),
  transportationMethods: rule(100, /^(?=.*[\p{L}])[\p{L}\p{M} ,_/-]+$/u, 'Hasta 100 caracteres: medios separados por coma. Ej.: A_PIE, COLECTIVO.'),
  bloodType: rule(3, /^(?:A|B|AB|O)[+-]$/, 'A+, A-, B+, B-, AB+, AB-, O+ u O-.'),
  healthInsurance: rule(50, summary, 'Hasta 50 caracteres: nombre o identificación de la cobertura.'),
  allergies: rule(255, summary, 'Hasta 255 caracteres: descripción breve o Sin alergias conocidas.'),
  birthPlace: rule(100, place, 'Hasta 100 caracteres; debe contener letras.'),
  address: rule(255, address, 'Hasta 255 caracteres: letras, números y signos de domicilio.'),
  gender: rule(30, words, 'Hasta 30 caracteres: letras y separadores.')
};
