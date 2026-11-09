/** Fecha ISO exacta: los navegadores permiten ingresar años de 5 dígitos. */
export function validStudentBirthDate(date:string, academicYear:number): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(date || '')) return 'Ingresá una fecha válida con año de cuatro dígitos (por ejemplo, 2023-10-10).';
  const [y,m,d] = date.split('-').map(Number);
  const actual = new Date(Date.UTC(y,m-1,d));
  if (actual.getUTCFullYear() !== y || actual.getUTCMonth() !== m-1 || actual.getUTCDate() !== d) return 'La fecha no existe en el calendario.';
  if (!Number.isInteger(academicYear) || academicYear < 2000 || academicYear > 2100) return 'Elegí un ciclo lectivo válido (2000 a 2100).';
  const cutoff = new Date(Date.UTC(academicYear, 5, 30));
  if (actual > cutoff) return 'El alumno todavía no había nacido al 30 de junio de ese ciclo lectivo.';
  return '';
}
export function studentAgeAtCutoff(date:string, year:number):number|null {
  if (validStudentBirthDate(date,year)) return null;
  const [bornYear, month]=date.split('-').map(Number);
  return year-bornYear-(month>=7?1:0);
}
