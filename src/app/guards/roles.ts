/** Permisos de navegación; el backend vuelve a validarlos en cada endpoint. */
export type Role = 'DIRECTOR' | 'ADMINISTRATIVE' | 'PRECEPTOR' | 'TEACHER' | 'TUTOR';
export type Capability = 'dashboard' | 'school' | 'school-edit' | 'students' | 'students-edit' |
  'staff' | 'staff-edit' | 'tutors' | 'tutors-edit' | 'rooms' | 'subjects' |
  'calendar' | 'fees' | 'announcements' | 'spreadsheet' | 'medical' | 'pickups' |
  'restrictions' | 'my-students' | 'my-profile';
export const CAPABILITY_ROLES: Record<Capability, readonly Role[]> = {
  dashboard:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR'],
  school:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER','TUTOR'],
  'school-edit':['DIRECTOR','ADMINISTRATIVE'],
  students:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER'],
  'students-edit':['DIRECTOR','ADMINISTRATIVE'],
  staff:['DIRECTOR','ADMINISTRATIVE'],
  'staff-edit':['DIRECTOR','ADMINISTRATIVE'],
  tutors:['DIRECTOR','ADMINISTRATIVE'],
  'tutors-edit':['DIRECTOR','ADMINISTRATIVE'],
  rooms:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER'],
  subjects:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER'],
  calendar:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER','TUTOR'],
  fees:['DIRECTOR','ADMINISTRATIVE','TUTOR'],
  announcements:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER','TUTOR'],
  spreadsheet:['DIRECTOR','ADMINISTRATIVE'],
  medical:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR'],
  pickups:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR'],
  restrictions:['DIRECTOR','ADMINISTRATIVE','PRECEPTOR'],
  'my-students':['TUTOR'],
  'my-profile':['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER']
};
export function can(role:string|null|undefined,capability:Capability): boolean {
  return CAPABILITY_ROLES[capability].includes((role||'') as Role);
}
export function landingFor(role:string):string {
  switch (role) {
    case 'TUTOR':return '/my-students';
    case 'PRECEPTOR':return '/dashboard';
    case 'TEACHER':return '/students';
    case 'DIRECTOR':case 'ADMINISTRATIVE':return '/dashboard';
    default:return '/login';
  }
}
