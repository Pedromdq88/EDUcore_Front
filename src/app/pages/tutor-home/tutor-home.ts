import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { getMultiTenantHeaders } from '../../services/tenant/tenant';
import { switchMap } from 'rxjs';

interface TutorProfile { id: string; firstName: string; lastName: string; email: string; }
interface LinkedStudent { id: string; firstName: string; lastName: string; classroom: string; academicYear: number; }
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-tutor-home',standalone:true,imports:[RouterLink],templateUrl:'./tutor-home.html',styleUrl:'./tutor-home.css'})
export class TutorHome implements OnInit {
 students=signal<LinkedStudent[]>([]); error=''; loading=true;
 profile=signal<TutorProfile|null>(null);
 medical=signal<Record<string,any>|null>(null);
 medicalStudent=signal<any|null>(null);
 medicalLoading=false;medicalError='';
 showMedical(student:any):void{
  if(!this.students().some(s=>s.id===student.id))return;
  this.medicalStudent.set(student);this.medical.set(null);this.medicalError='';this.medicalLoading=true;
  this.http.get<Record<string,any>>(`/api/v1/students/${encodeURIComponent(student.id)}/medical-record`,{headers:getMultiTenantHeaders()})
   .subscribe({next:record=>{this.medical.set(record);this.medicalLoading=false;},error:()=>{this.medicalError='No se pudo consultar la ficha médica.';this.medicalLoading=false;}});
 }
 closeMedical():void {this.medicalStudent.set(null);this.medical.set(null);this.medicalError='';}
 get hasMedicalRecord():boolean {return !!this.medical()?.['id'];}
 get medicalDetails():Array<{key:string;label:string;value:string}>{
  const rec=this.medical();if(!rec)return [];
  return Object.entries(rec).filter(([k,v])=>!['id','studentId','tenantId'].includes(k)&&v!==null&&v!==undefined&&v!=='')
    .map(([key,v])=>({key,label:key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase()),value:typeof v==='boolean'?(v?'Sí':'No'):String(v)}));
 }

 constructor(private http:HttpClient){}
 ngOnInit(): void {
  if (sessionStorage.getItem('current_user_role') !== 'TUTOR') {
    this.loading = false;
    this.error = 'Este portal es exclusivo para tutores. Cerrá la sesión e ingresá con tu cuenta de tutor.';
    return;
  }
  const headers = getMultiTenantHeaders();
  // Sin legajo verificado no se cargan alumnos ni se muestra información de otras familias.
  this.http.get<TutorProfile>('/api/v1/auth/my-tutor', {headers}).pipe(
    switchMap(profile => {
      this.profile.set(profile);
      return this.http.get<LinkedStudent[]>('/api/v1/auth/my-students', {headers});
    })
  ).subscribe({
    next: items => { this.students.set(items); this.loading = false; },
    error: err => {
      this.students.set([]);
      this.profile.set(null);
      this.loading = false;
      this.error = err?.status === 401
        ? 'Tu sesión venció. Cerrá sesión y volvé a ingresar como tutor.'
        : err?.status === 409
        ? 'Tu cuenta existe, pero falta vincularla a tu ficha de tutor. Pedí a Dirección o Administración que revise tu cuenta y tu legajo.'
        : err?.status === 403
        ? 'Los datos de tu cuenta no coinciden con tu legajo. Por seguridad no podemos mostrar alumnos. Contactá a la institución.'
        : 'No se pudieron consultar tus estudiantes. Revisá tu sesión o consultá a la institución.';
    }
  });
 }
}
