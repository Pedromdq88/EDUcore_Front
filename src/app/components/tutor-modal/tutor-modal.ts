import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TutorService } from '../../services/tutor/tutor';
import { Tutor } from '../../models/tutor';

@Component({selector:'app-tutor-modal',standalone:true,imports:[FormsModule],templateUrl:'./tutor-modal.html',styleUrl:'./tutor-modal.css'})
export class TutorModal implements OnInit {
  @Input() existing: Tutor | null = null;
  @Input() existingTutors: Tutor[]=[];
  @Output() selectedExisting=new EventEmitter<Tutor>();
  duplicate:Tutor|null=null;
  @Output() saved = new EventEmitter<Tutor>();
  @Output() dismissed = new EventEmitter<void>();
  busy=false; error='';
  form: Tutor = this.blank();
  constructor(private api:TutorService){}
  ngOnInit():void {if(this.existing)this.form={...this.blank(),...this.existing};}
  useExisting():void { if(this.duplicate)this.selectedExisting.emit(this.duplicate); }
  blank():Tutor{return {firstName:'',lastName:'',documentNumber:'',relationship:'MADRE',phone:'',email:'',nacionalidad:'Argentina',profesion:'',condicionActividad:'EMPLEADO',convive:'SI',direccion:''};}
  submit():void {
    if(this.busy)return;
    if(!this.form.firstName.trim()||!this.form.lastName.trim()||!this.form.documentNumber.trim()){
      this.error='Completá nombre, apellido y DNI.';return;
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())){
      this.error='El correo es obligatorio para crear su usuario de acceso.';return;
    }
    const dni=this.form.documentNumber.replace(/\D/g,'');
    this.duplicate=this.existingTutors.find(t=>!!t.documentNumber && t.documentNumber.replace(/\D/g,'')===dni && t.id!==this.existing?.id)||null;
    if(this.duplicate){this.error='Este DNI ya está registrado. Usá el tutor existente, sin duplicar el legajo.';return;}
    this.busy=true;this.error='';
    const request=this.existing?.id?this.api.updateTutor(this.existing.id,this.form):this.api.createTutor(this.form);
    request.subscribe({next:t=>{this.busy=false;this.saved.emit(t);},error:e=>{this.busy=false;
      this.error=e.status===401?'Tu sesión expiró o no tenés autorización. Volvé a iniciar sesión con Director o Administrativo.':
        e.status===409?(e.error?.message||'Ya existe un tutor con este correo o DNI. Elegilo desde el buscador.'):
        (e?.error?.detail||e?.error?.message||`No se pudo guardar el tutor (HTTP ${e.status||'sin conexión'}).`);
    }});
  }
}
