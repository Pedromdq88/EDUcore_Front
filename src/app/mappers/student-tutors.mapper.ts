import { Student } from '../models/student';
export function studentWithPrimaryTutor(student: Student, primaryTutorId?: string): Student {
  const tutors = [...(student.tutors || [])];
  if (primaryTutorId) {
    tutors.sort((left, right) => left.id === primaryTutorId ? -1 : right.id === primaryTutorId ? 1 : 0);
  }
  return {
    ...student,
    tutors,
    primaryTutorId: primaryTutorId || ''
  };
}
