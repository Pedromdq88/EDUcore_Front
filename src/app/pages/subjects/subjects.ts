import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SubjectService } from '../../services/subjects/subjects';
@Component({selector:'app-subjects',standalone:true,imports:[FormsModule],templateUrl:'./subjects.html',styleUrl:'./subjects.css'})
export class Subjects implements OnInit {
 subjects=signal<any[]>([]); name=''; error=''; busy=false;
 get canEdit():boolean { return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || ''); }
 constructor(private api:SubjectService){}
 ngOnInit():void {this.load();}
 load():void {this.api.getSubjects().subscribe({next:list=>this.subjects.set(list),error:()=>this.error='No se pudieron cargar las materias.'});}
 add():void {
  const name=this.name.trim();if(!name || !this.canEdit)return;
  this.busy=true;this.error='';this.api.createSubject({name}).subscribe({next:()=>{this.name='';this.busy=false;this.load();},error:()=>{this.error='No se pudo registrar la materia.';this.busy=false;}});
 }
 remove(id:string):void {
  if(!this.canEdit || !confirm('¿Eliminar la materia del catálogo?'))return;
  this.api.deleteSubject(id).subscribe({next:()=>this.load(),error:()=>this.error='No se pudo eliminar la materia.'});
 }
}
