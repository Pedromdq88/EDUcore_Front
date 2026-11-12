import { Tutor } from '../models/tutor';

export function toTutorPayload(source: Tutor): Tutor {
  return {
    ...source,
    firstName: source.firstName.trim(),
    lastName: source.lastName.trim(),
    documentNumber: source.documentNumber.trim(),
    email: source.email.trim().toLowerCase(),
    phone: (source.phone ?? '').trim()
  };
}

export interface TutorAssignmentPayload {
  tutorId: string;
  relationshipType: string;
  isPrimary: boolean;
}
export function toStudentTutorAssignments(ids: string[], tutors: Tutor[]): TutorAssignmentPayload[] {
  return ids.filter(Boolean).map((id, index) => ({
    tutorId: id,
    relationshipType: tutors.find(tutor => tutor.id === id)?.relationship || 'TUTOR_LEGAL',
    isPrimary: index === 0
  }));
}
