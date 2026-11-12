import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { StudentList } from './pages/student/student-list/student-list';
import { StudentForm } from './pages/student/student-form/student-form';
import { StudentDetail } from './pages/student/student-detail/student-detail';
import { TeacherList } from './pages/teacher/teacher-list/teacher-list';
import { TeacherForm } from './pages/teacher/teacher-form/teacher-form';
import { TeacherDetail } from './pages/teacher/teacher-detail/teacher-detail';
import { TutorList } from './pages/tutor/tutor-list/tutor-list';
import { TutorForm } from './pages/tutor/tutor-form/tutor-form';
import { TutorDetail } from './pages/tutor/tutor-detail/tutor-detail';
import { TenantDetail } from './pages/tenant/tenant-detail/tenant-detail';
import { TenantForm } from './pages/tenant/tenant-form/tenant-form';
import { YearPromotion } from './pages/year-promotion/year-promotion';
import { FeeList } from './pages/fee/fee-list/fee-list';
import { FeeDetail } from './pages/fee/fee-detail/fee-detail';
import { ShiftList } from './pages/shift/shift-list/shift-list';
import { authGuard } from './guards/auth-guard';
import { CAPABILITY_ROLES } from './guards/roles';
import { Login } from './pages/login/login';
import { PasswordRecovery } from './pages/password-recovery/password-recovery';
import { Subjects } from './pages/subjects/subjects';
import { Announcements } from './pages/announcements/announcements';
import { Spreadsheet } from './pages/spreadsheet/spreadsheet';
import { Calendar } from './pages/calendar/calendar';
import { StudentRecords } from './pages/student-records/student-records';
import { TutorHome } from './pages/tutor-home/tutor-home';
import { TutorStudentDetail } from './pages/tutor-home/tutor-student-detail';
import { TutorStudentMedical } from './pages/tutor-home/tutor-student-medical';
import { ForcedPassword } from './pages/forced-password/forced-password';
import { MyStaff } from './pages/my-staff/my-staff';



export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'forgot-password', component: PasswordRecovery },
  { path: 'change-password', component: ForcedPassword, canActivate: [authGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full'  },
  { path: 'dashboard', component: Dashboard ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['dashboard'] }},

  // Alumnos
  { path: 'students', component: StudentList ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['students'] }},
  { path: 'students/new', component: StudentForm ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['students-edit'] }},
  { path: 'students/:id/edit', component: StudentForm ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['students-edit'] }},
  { path: 'students/:id', component: StudentDetail ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['students'] }},

  // Docentes y Staff
  { path: 'teachers', component: TeacherList ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['staff'] }},
  { path: 'teachers/new', component: TeacherForm ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['staff-edit'] }},
  { path: 'teachers/:id/edit', component: TeacherForm ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['staff-edit'] }},
  { path: 'teachers/:id', component: TeacherDetail ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['staff'] }},

  // Tutores
  { path: 'tutors', component: TutorList ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['tutors'] }},
  { path: 'tutors/new', component: TutorForm ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['tutors-edit'] }},
  { path: 'tutors/:id/edit', component: TutorForm ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['tutors-edit'] }},
  { path: 'tutors/:id', component: TutorDetail ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['tutors'] }},

  // Institución
  { path: 'school-profile', component: TenantDetail ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['school'] }},
  { path: 'school-profile/edit', component: TenantForm ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['school-edit'] }},
  { path: 'school-profile/promotion', component: YearPromotion, canActivate: [authGuard], data: { roles:['DIRECTOR','ADMINISTRATIVE'] } },

  // Cuotas
  { path: 'fees', component: FeeList ,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['fees'] }},
  { path: 'fees/:id', component: FeeDetail ,canActivate: [authGuard], data: { roles: ['DIRECTOR','ADMINISTRATIVE'] }},

  // Aulas y Horarios
  { path: 'shifts', component: ShiftList,canActivate: [authGuard], data: { roles: CAPABILITY_ROLES['rooms'] }
   },

  { path:'my-profile',component:MyStaff,canActivate:[authGuard],data:{roles:CAPABILITY_ROLES['my-profile']} },
  { path:'my-students',data:{roles:CAPABILITY_ROLES['my-students']},component:TutorHome,canActivate:[authGuard] },
  { path:'my-students/:id/medical',data:{roles:CAPABILITY_ROLES['my-students']},component:TutorStudentMedical,canActivate:[authGuard] },
  { path:'my-students/:id',data:{roles:CAPABILITY_ROLES['my-students']},component:TutorStudentDetail,canActivate:[authGuard] },
  // Módulos recuperados del frontend tradicional
  { path:'subjects',data:{roles:CAPABILITY_ROLES['subjects']},component:Subjects,canActivate:[authGuard] },
  { path:'announcements',data:{roles:CAPABILITY_ROLES['announcements']},component:Announcements,canActivate:[authGuard] },
  { path:'spreadsheet',data:{roles:CAPABILITY_ROLES['spreadsheet']},component:Spreadsheet,canActivate:[authGuard] },
  { path:'calendar',data:{roles:CAPABILITY_ROLES['calendar']},component:Calendar,canActivate:[authGuard] },
  { path:'medical',component:StudentRecords,data:{mode:'medical',roles:CAPABILITY_ROLES['medical']},canActivate:[authGuard] },
  { path:'pickups',component:StudentRecords,data:{mode:'pickups',roles:CAPABILITY_ROLES['pickups']},canActivate:[authGuard] },
  { path:'restrictions',component:StudentRecords,data:{mode:'restrictions',roles:CAPABILITY_ROLES['restrictions']},canActivate:[authGuard] },

  // Ruta comodín para redirigir URLs no encontradas
  { path: '**', redirectTo: 'dashboard' }
];