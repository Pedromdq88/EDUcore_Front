import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { ValidateSubmitDirective } from '../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../utils/forms/field-validation.directive';
import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { getMultiTenantHeaders } from '../../services/tenant/tenant';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnnouncementService } from '../../services/announcements/announcements';
import { ShiftService } from '../../services/shift/shift';

interface LinkedStudent { id: string; firstName: string; lastName: string; }

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-announcements',standalone:true,imports: [FieldValidationDirective, ValidateSubmitDirective, FormsModule,DatePipe],templateUrl:'./announcements.html',styleUrl:'./announcements.css'})
export class Announcements implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);

  private readonly dialogs=inject(UiDialogService);

  readonly canDiscardForm = canDiscardForm;
 items=signal<any[]>([]);rooms=signal<any[]>([]);linkedStudents=signal<LinkedStudent[]>([]);private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
  creating=false;private readonly busyState = signal(false);
  get busy(): boolean {return this.busyState();}
  set busy(value: boolean) {this.busyState.set(value);}
  
 editingId='';title='';content='';category='GENERAL';scope='GLOBAL';targetClassroom='';targetStudentId='';mediaUrl='';isPinned=false;
 get canEdit():boolean{return ['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER'].includes(sessionStorage.getItem('current_user_role')||'');}
 get isTeacher():boolean{return sessionStorage.getItem('current_user_role')==='TEACHER';}
 get isTutor():boolean{return sessionStorage.getItem('current_user_role')==='TUTOR';}
 recipientName(studentId:string|null):string {
   const student=this.linkedStudents().find(s=>s.id===studentId);
   return student ? `${student.firstName} ${student.lastName}` : 'Alumno vinculado';
 }
 constructor(private api:AnnouncementService,private shifts:ShiftService,private http:HttpClient){}
 ngOnInit():void{this.load();if(this.canEdit){this.shifts.getClassroomsConfig().subscribe({next:r=>this.rooms.set(r),error:()=>{}});}}
 load():void {
   this.error='';
   if(this.isTutor) {
     forkJoin({
       notices:this.api.getAnnouncements(),
       students:this.http.get<LinkedStudent[]>('/api/v1/auth/my-students',{headers:getMultiTenantHeaders()})
     }).subscribe({
       next:({notices,students})=>{
         this.linkedStudents.set(students);
         const ids=new Set(students.map(s=>s.id));
         this.items.set(notices.filter(a=>
           ['GLOBAL','CLASSROOM'].includes(a.scope) ||
           (a.scope==='PRIVATE_STUDENT' && ids.has(a.targetStudentId))));
       },
       error:e=>{this.error=`No se pudieron cargar los comunicados (HTTP ${e.status||'sin conexión'}).`;}
     });
     return;
   }
   this.api.getAnnouncements().subscribe({
     next:r=>this.items.set(r.filter(a=>['GLOBAL','CLASSROOM'].includes(a.scope))),
     error:()=>this.error='No se pudieron cargar los comunicados.'
   });
 }
 openNew():void{this.editingId='';this.title='';this.content='';this.category='GENERAL';this.scope=this.isTeacher?'CLASSROOM':'GLOBAL';this.targetClassroom='';this.targetStudentId='';this.mediaUrl='';this.isPinned=false;this.creating=true;}
 edit(a:any):void{if(a.scope==='PRIVATE_STUDENT')return;this.editingId=a.id;this.title=a.title;this.content=a.content;this.category=a.category||'GENERAL';this.scope=a.scope||'GLOBAL';this.targetClassroom=a.targetClassroom||'';this.targetStudentId=a.targetStudentId||'';this.mediaUrl=a.mediaUrl||'';this.isPinned=!!a.isPinned;this.creating=true;}
 save():void{if(this.busy)return;
  if(!this.title.trim()||!this.content.trim()||!this.canEdit)return;
  if(this.isTeacher&&this.scope==='GLOBAL'){this.error='El docente no puede publicar comunicados globales.';return;}
  if(this.scope==='PRIVATE_STUDENT'){this.error='Los avisos privados se crean desde el perfil del alumno.';return;}
  if(this.scope==='CLASSROOM'&&!this.targetClassroom){this.error='Seleccioná un aula.';return;}
  this.busy=true;this.error='';const email=sessionStorage.getItem('current_user_email')||'institucion@local.invalid';
  const payload={authorId:email,authorName:email.split('@')[0],authorRole:sessionStorage.getItem('current_user_role'),title:this.title.trim(),content:this.content.trim(),category:this.category,scope:this.scope,targetClassroom:this.scope==='CLASSROOM'?this.targetClassroom:null,targetStudentId:this.scope==='PRIVATE_STUDENT'?this.targetStudentId:null,mediaUrl:this.mediaUrl||null,isPinned:this.isPinned};
  const op=this.editingId?this.api.updateAnnouncement(this.editingId,payload):this.api.createAnnouncement(payload);
  op.subscribe({next:()=>{this.busy=false;this.creating=false;this.load();},error:e=>{this.busy=false;this.error='No se pudo guardar el comunicado (HTTP '+(e.status||'sin conexión')+').';}});
 }
 async remove(id:string):Promise<void>{if(!this.canEdit||!(await this.dialogs.confirm('¿Eliminar el comunicado?')))return;this.api.deleteAnnouncement(id).subscribe({next:()=>this.load(),error:()=>this.error='No se pudo eliminar el comunicado.'});}

  /** Conservar los campos hasta que la persona acepte descartar los cambios. */
  async confirmDiscard(form: { dirty?: boolean | null } | null | undefined, target: string): Promise<void> {
    if (form?.dirty && !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios'))) return;
    this.formCdr.markForCheck();
    if (target === 'dismissed') {
      (this as any).dismissed?.emit();
    } else {
      (this as any)[target] = false;
      this.formCdr.markForCheck();
    }
  }
}
