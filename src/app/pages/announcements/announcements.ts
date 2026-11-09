import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnnouncementService } from '../../services/announcements/announcements';
import { ShiftService } from '../../services/shift/shift';
import { StudentService } from '../../services/student/student';

@Component({selector:'app-announcements',standalone:true,imports:[FormsModule,DatePipe],templateUrl:'./announcements.html',styleUrl:'./announcements.css'})
export class Announcements implements OnInit {
 items=signal<any[]>([]);rooms=signal<any[]>([]);students=signal<any[]>([]);error='';creating=false;busy=false;
 editingId='';title='';content='';category='GENERAL';scope='GLOBAL';targetClassroom='';targetStudentId='';mediaUrl='';isPinned=false;
 get canEdit():boolean{return ['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER'].includes(sessionStorage.getItem('current_user_role')||'');}
 get isTeacher():boolean{return sessionStorage.getItem('current_user_role')==='TEACHER';}
 get canPrivate():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
 constructor(private api:AnnouncementService,private shifts:ShiftService,private studentApi:StudentService){}
 ngOnInit():void{this.load();if(this.canEdit){this.shifts.getClassroomsConfig().subscribe({next:r=>this.rooms.set(r),error:()=>{}});this.studentApi.getStudents().subscribe({next:r=>this.students.set(r),error:()=>{}});}}
 load():void{this.api.getAnnouncements().subscribe({next:r=>this.items.set(r),error:()=>this.error='No se pudieron cargar los comunicados.'});}
 openNew():void{this.editingId='';this.title='';this.content='';this.category='GENERAL';this.scope=this.isTeacher?'CLASSROOM':'GLOBAL';this.targetClassroom='';this.targetStudentId='';this.mediaUrl='';this.isPinned=false;this.creating=true;}
 edit(a:any):void{this.editingId=a.id;this.title=a.title;this.content=a.content;this.category=a.category||'GENERAL';this.scope=a.scope||'GLOBAL';this.targetClassroom=a.targetClassroom||'';this.targetStudentId=a.targetStudentId||'';this.mediaUrl=a.mediaUrl||'';this.isPinned=!!a.isPinned;this.creating=true;}
 save():void{
  if(!this.title.trim()||!this.content.trim()||!this.canEdit)return;
  if(this.isTeacher&&this.scope==='GLOBAL'){this.error='El docente no puede publicar comunicados globales.';return;}
  if(this.scope==='CLASSROOM'&&!this.targetClassroom){this.error='Seleccioná un aula.';return;}
  if(this.scope==='PRIVATE_STUDENT'&&!this.targetStudentId){this.error='Seleccioná un destinatario.';return;}
  this.busy=true;this.error='';const email=sessionStorage.getItem('current_user_email')||'institucion@local.invalid';
  const payload={authorId:email,authorName:email.split('@')[0],authorRole:sessionStorage.getItem('current_user_role'),title:this.title.trim(),content:this.content.trim(),category:this.category,scope:this.scope,targetClassroom:this.scope==='CLASSROOM'?this.targetClassroom:null,targetStudentId:this.scope==='PRIVATE_STUDENT'?this.targetStudentId:null,mediaUrl:this.mediaUrl||null,isPinned:this.isPinned};
  const op=this.editingId?this.api.updateAnnouncement(this.editingId,payload):this.api.createAnnouncement(payload);
  op.subscribe({next:()=>{this.busy=false;this.creating=false;this.load();},error:e=>{this.busy=false;this.error='No se pudo guardar el comunicado (HTTP '+(e.status||'sin conexión')+').';}});
 }
 remove(id:string):void{if(!this.canEdit||!confirm('¿Eliminar el comunicado?'))return;this.api.deleteAnnouncement(id).subscribe({next:()=>this.load(),error:()=>this.error='No se pudo eliminar el comunicado.'});}
}
