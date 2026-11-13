import { describe, expect, it } from 'vitest';
import { toStudentTutorAssignments } from './tutor.mapper';
describe('asignación tutor alumno', () => {
  it('asigna tutor principal una sola vez', () => {
    const result = toStudentTutorAssignments(['a', 'b'], [
      {
        id: 'a',
        firstName: 'A',
        lastName: 'Uno',
        documentNumber: '12345678',
        relationship: 'MADRE',
        phone: '',
        email: 'a@test.com',
        nacionalidad: '',
        profesion: '',
        condicionActividad: '',
        convive: '',
        direccion: ''
      },
      {
        id: 'b',
        firstName: 'B',
        lastName: 'Dos',
        documentNumber: '23456789',
        relationship: 'PADRE',
        phone: '',
        email: 'b@test.com',
        nacionalidad: '',
        profesion: '',
        condicionActividad: '',
        convive: '',
        direccion: ''
      }
    ]);
    expect(result.map(x => x.isPrimary)).toEqual([true, false]);
    expect(result.map(x => x.relationshipType)).toEqual(['MADRE', 'PADRE']);
  });
});
