import { Teacher } from '../models/teacher';
export function toTeacherPayload(source: Teacher): Teacher {
  return {
    ...source,
    firstName: source.firstName.trim(),
    lastName: source.lastName.trim(),
    email: source.email.trim().toLowerCase(),
    documentNumber: source.documentNumber?.trim(),
    assignments: source.assignments.map(assignment => ({
      ...assignment
    }))
  };
}
