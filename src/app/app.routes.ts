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
import { FeeList } from './pages/fee/fee-list/fee-list';
import { FeeDetail } from './pages/fee/fee-detail/fee-detail';
import { ShiftList } from './pages/shift/shift-list/shift-list';
import { authGuard } from './guards/auth-guard';
import { Login } from './pages/login/login';
import { Subjects } from './pages/subjects/subjects';
import { Announcements } from './pages/announcements/announcements';
import { Spreadsheet } from './pages/spreadsheet/spreadsheet';
import { Calendar } from './pages/calendar/calendar';
import { StudentRecords } from './pages/student-records/student-records';
import { TutorHome } from './pages/tutor-home/tutor-home';



export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full'  },
  { path: 'dashboard', component: Dashboard ,canActivate: [authGuard]},

  // Alumnos
  { path: 'students', component: StudentList ,canActivate: [authGuard]},
  { path: 'students/new', component: StudentForm ,canActivate: [authGuard]},
  { path: 'students/:id', component: StudentDetail ,canActivate: [authGuard]},

  // Docentes y Staff
  { path: 'teachers', component: TeacherList ,canActivate: [authGuard]},
  { path: 'teachers/new', component: TeacherForm ,canActivate: [authGuard]},
  { path: 'teachers/:id', component: TeacherDetail ,canActivate: [authGuard]},

  // Tutores
  { path: 'tutors', component: TutorList ,canActivate: [authGuard]},
  { path: 'tutors/new', component: TutorForm ,canActivate: [authGuard]},
  { path: 'tutors/:id', component: TutorDetail ,canActivate: [authGuard]},

  // Institución
  { path: 'school-profile', component: TenantDetail ,canActivate: [authGuard]},
  { path: 'school-profile/edit', component: TenantForm ,canActivate: [authGuard]},

  // Cuotas
  { path: 'fees', component: FeeList ,canActivate: [authGuard]},
  { path: 'fees/:id', component: FeeDetail ,canActivate: [authGuard]},

  // Aulas y Horarios
  { path: 'shifts', component: ShiftList,canActivate: [authGuard]
   },

  { path:'my-students',component:TutorHome,canActivate:[authGuard] },
  // Módulos recuperados del frontend tradicional
  { path:'subjects',component:Subjects,canActivate:[authGuard] },
  { path:'announcements',component:Announcements,canActivate:[authGuard] },
  { path:'spreadsheet',component:Spreadsheet,canActivate:[authGuard] },
  { path:'calendar',component:Calendar,canActivate:[authGuard] },
  { path:'medical',component:StudentRecords,data:{mode:'medical'},canActivate:[authGuard] },
  { path:'pickups',component:StudentRecords,data:{mode:'pickups'},canActivate:[authGuard] },
  { path:'restrictions',component:StudentRecords,data:{mode:'restrictions'},canActivate:[authGuard] },

  // Ruta comodín para redirigir URLs no encontradas
  { path: '**', redirectTo: 'dashboard' }
];