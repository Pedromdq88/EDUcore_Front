import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TutorService } from '../../../services/tutor/tutor';
import { Tutor } from '../../../models/tutor';
@Component({selector:'app-tutor-form',standalone:true,imports:[FormsModule,RouterLink],templateUrl:'./tutor-form.html',styleUrl:'./tutor-form.css'})
export class TutorForm implements OnInit {
 editingId='';busy=false;error='';loading=false;loadFailed=false;
 form:Tutor={firstName:'',lastName:'',documentNumber:'',relationship:'MADRE',phone:'',email:'',nacionalidad:'Argentina',profesion:'',condicionActividad:'EMPLEADO',convive:'SI',direccion:''};
 constructor(private api:TutorService,private router:Router,private route:ActivatedRoute){}
 ngOnInit():void {this.editingId=this.route.snapshot.paramMap.get('id')||'';if(this.editingId){this.loading=true;this.api.getTutors().subscribe({next:items=>{const t=items.find(x=>x.id===this.editingId);this.loading=false;if(t)this.form={...this.form,...t};else {this.loadFailed=true;this.error='No se encontró el tutor: no se pueden editar datos en blanco.';}},error:()=>{this.loading=false;this.loadFailed=true;this.error='No se pudo cargar el tutor: edición bloqueada para evitar sobrescribir su ficha.';}});}}
 submitTutor():void {
  if(this.loading||this.loadFailed)return;
  if(!this.form.firstName.trim()||!this.form.lastName.trim()||!this.form.documentNumber.trim()){this.error='Completá nombre, apellido y DNI.';return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())){this.error='El correo es obligatorio para crear su cuenta de tutor.';return;}
  this.busy=true;this.error='';const op=this.editingId?this.api.updateTutor(this.editingId,this.form):this.api.createTutor(this.form);
  op.subscribe({next:(t)=>{this.busy=false;this.router.navigate(this.editingId?['/tutors',this.editingId]:['/tutors']);},error:e=>{this.busy=false;this.error='No se pudo guardar el tutor (HTTP '+(e.status||'sin conexión')+').';}});
 }
}
