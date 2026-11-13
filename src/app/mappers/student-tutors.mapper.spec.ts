import { describe, expect, it } from 'vitest';
import { studentWithPrimaryTutor } from './student-tutors.mapper';
import type { Student } from '../models/student';
describe('tutor principal (enlace persistido en MySQL)', () => {
  const data = {
    id: 's1',
    tutors: [{
      id: 'secundario'
    }, {
      id: 'principal'
    }]
  } as Student;
  it('promueve al tutor marcado sin mutar la respuesta', () => {
    const result = studentWithPrimaryTutor(data, 'principal');
    expect(result.tutors?.map(t => t.id)).toEqual(['principal', 'secundario']);
    expect(data.tutors?.[0].id).toBe('secundario');
    expect(result.primaryTutorId).toBe('principal');
  });
  it('no inventa un tutor principal si el registro antiguo no lo tiene', () => {
    const result = studentWithPrimaryTutor(data);
    expect(result.primaryTutorId).toBe('');
  });
});
