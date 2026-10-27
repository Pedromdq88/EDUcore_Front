import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnnouncementService } from '../../services/announcements/announcements';
import { ShiftService } from '../../services/shift/shift';
@Component({selector:'app-announcements',standalone:true,imports:[FormsModule,DatePipe],templateUrl:'./announcements.html',styleUrl:'./announcements.css'})
export class Announcements implements OnInit {
 items=signal<any[]>([]);rooms=signal<any[]>([]); creating=false; error=''; busy=false;
 title='';content='';category='GENERAL';scope='GLOBAL';targetClassroom='';
 get canEdit():boolean {return ['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER'].includes(sessionStorage.getItem('current_user_role') || '');}
 constructor(private api:AnnouncementService,private shifts:ShiftService){}
 ngOnInit():void {this.load();this.shifts.getClassroomsConfig().subscribe({next:a=>this.rooms.set(a),error:()=>{}});}
 load():void {this.api.getAnnouncements().subscribe({next:a=>this.items.set(a),error:()=>this.error='No se pudieron cargar los comunicados.'});}
 save():void {
  if(!this.title.trim()||!this.content.trim()||!this.canEdit)return;
  this.busy=true;this.error='';const email=sessionStorage.getItem('current_user_email')||'';
  const payload={authorId:email,authorName:email.split('@')[0],authorRole:sessionStorage.getItem('current_user_role'),title:this.title.trim(),content:this.content.trim(),category:this.category,scope:this.scope,targetClassroom:this.scope==='CLASSROOM'?this.targetClassroom:null,targetStudentId:null,mediaUrl:null,isPinned:false};
  this.api.createAnnouncement(payload).subscribe({next:()=>{this.busy=false;this.creating=false;this.title='';this.content='';this.load();},error:()=>{this.busy=false;this.error='No se pudo publicar el comunicado.';}});
 }
 remove(id:string):void{if(!this.canEdit || !confirm('¿Eliminar este comunicado?'))return;this.api.deleteAnnouncement(id).subscribe({next:()=>this.load(),error:()=>this.error='No se pudo eliminar el comunicado.'});}
}
