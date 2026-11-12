import { validNumericDni, validNumericPhone } from '../../../validators/identity.validator';
import { apiErrorMessage } from '../../../utils/forms/api-error';
import { ValidateSubmitDirective } from '../../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../../utils/forms/field-validation.directive';
import { signal, Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TutorService } from '../../../services/tutor/tutor';
import { Tutor } from '../../../models/tutor';
import { toTutorPayload } from '../../../mappers/tutor.mapper';
import { validEmail, validDni } from '../../../validators/identity.validator';
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-tutor-form',standalone:true,imports: [FieldValidationDirective, ValidateSubmitDirective, FormsModule,RouterLink],templateUrl:'./tutor-form.html',styleUrl:'./tutor-form.css'})
export class TutorForm implements OnInit {
 editingId='';private readonly busyState = signal(false);
  get busy(): boolean {return this.busyState();}
  set busy(value: boolean) {this.busyState.set(value);}
  private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
  private readonly loadingState = signal(false);
  get loading(): boolean {return this.loadingState();}
  set loading(value: boolean) {this.loadingState.set(value);}
  loadFailed=false;
 form:Tutor={firstName:'',lastName:'',documentNumber:'',relationship:'MADRE',phone:'',email:'',nacionalidad:'Argentina',profesion:'',condicionActividad:'EMPLEADO',convive:'SI',direccion:''};
 constructor(private api:TutorService,private router:Router,private route:ActivatedRoute){}
 ngOnInit():void {this.editingId=this.route.snapshot.paramMap.get('id')||'';if(this.editingId){this.loading=true;this.api.getTutors().subscribe({next:items=>{const t=items.find(x=>x.id===this.editingId);this.loading=false;if(t)this.form={...this.form,...t};else {this.loadFailed=true;this.error='No se encontró el tutor: no se pueden editar datos en blanco.';}},error:()=>{this.loading=false;this.loadFailed=true;this.error='No se pudo cargar el tutor: edición bloqueada para evitar sobrescribir su ficha.';}});}}
 submitTutor():void {if(this.busy)return;

  if(this.loading||this.loadFailed)return;
  if(!this.form.firstName.trim()||!this.form.lastName.trim()||!this.form.documentNumber.trim()){this.error='Completá nombre, apellido y DNI.';return;}
  if(!validEmail(this.form.email)){this.error='El correo es obligatorio para crear su cuenta de tutor.';return;}
  if(!validNumericDni(this.form.documentNumber)){this.error='Ingresá un DNI válido de 6 a 12 dígitos.';return;}
  if(!validNumericPhone(this.form.phone)){this.error='El teléfono debe tener solo números (6 a 20 dígitos).';return;}
  this.busy=true;this.error='';const payload=toTutorPayload(this.form);const op=this.editingId?this.api.updateTutor(this.editingId,payload):this.api.createTutor(payload);
  op.subscribe({next:(t)=>{this.busy=false;this.router.navigate(this.editingId?['/tutors',this.editingId]:['/tutors']);},error:e=>{this.busy=false;this.error=apiErrorMessage(e,'No se pudo guardar el tutor');}});
 }
}
