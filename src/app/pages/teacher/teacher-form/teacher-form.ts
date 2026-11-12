import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { NgForm } from '@angular/forms';
import { canDiscardForm } from '../../../utils/forms/form-ux';
import { validNumericDni, validNumericPhone } from '../../../validators/identity.validator';
import { ValidateSubmitDirective } from '../../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../../utils/forms/field-validation.directive';
import { ViewChild, Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TeacherService } from '../../../services/teacher/teacher';
import { ShiftService } from '../../../services/shift/shift';
import { SubjectService } from '../../../services/subjects/subjects';
import { Teacher } from '../../../models/teacher';
import { toTeacherPayload } from '../../../mappers/teacher.mapper';
import { validEmail, validDni } from '../../../validators/identity.validator';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-teacher-form',standalone:true,imports: [FieldValidationDirective, ValidateSubmitDirective, CommonModule,FormsModule,RouterLink],templateUrl:'./teacher-form.html',styleUrl:'./teacher-form.css'})
export class TeacherForm implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);

  private readonly dialogs=inject(UiDialogService);

  readonly canDiscardForm = canDiscardForm;
  @ViewChild(NgForm) private editableForm?: NgForm;
  async closeEditor(): Promise<void> {
    if(this.busy || (this.editableForm?.dirty &&
      !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios')))) return;
    this.formCdr.markForCheck();
    this.dismissed.emit();
  }
 @Input() embedded=false; @Input() staffId=''; @Output() saved=new EventEmitter<string>(); @Output() dismissed=new EventEmitter<void>();
 editingId='';classrooms=signal<any[]>([]);subjects=signal<any[]>([]);private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
  private readonly busyState = signal(false);
  get busy(): boolean {return this.busyState();}
  set busy(value: boolean) {this.busyState.set(value);}
  private readonly loadingState = signal(false);
  get loading(): boolean {return this.loadingState();}
  set loading(value: boolean) {this.loadingState.set(value);}
  loadFailed=false;
 form:Teacher={firstName:'',lastName:'',documentNumber:'',email:'',role:'TEACHER',phone:'',hireDate:new Date().toISOString().slice(0,10),classroom:null,status:'ACTIVE',assignments:[]};
 get isDirector():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
 constructor(private api:TeacherService,private shifts:ShiftService,private subjectsApi:SubjectService,private route:ActivatedRoute,private router:Router){}
 ngOnInit():void {this.editingId=this.staffId||this.route.snapshot.paramMap.get('id')||'';
  this.shifts.getClassroomsConfig().subscribe({next:r=>this.classrooms.set(r),error:()=>this.error='No se pudieron cargar las aulas.'});
  this.subjectsApi.getSubjects().subscribe({next:(r: any[])=>this.subjects.set(r),error:()=>this.error='No se pudieron cargar las materias.'});
  if(this.editingId){this.loading=true;this.api.getStaffById(this.editingId).subscribe({next:t=>{this.loading=false;this.form={...this.form,...t,assignments:(t.assignments||[]).map(a=>({...a}))};},error:()=>{this.loading=false;this.loadFailed=true;this.error='No se pudo cargar el personal: no se pueden editar datos en blanco.';}});}
 }
 addAssignment():void {this.form.assignments.push({subject:'',classroom:'',shift:'MANANA',isClassroomTeacher:false});}
 removeAssignment(index:number):void {this.form.assignments.splice(index,1);}
 private backendError(e:any):string {
  if(e?.status===401)return 'Tu sesión venció o el servidor no reconoce el token. Volvé a iniciar sesión como Director o Administrativo.';
  if(e?.status===403)return 'Tu cuenta no tiene permiso para registrar personal. Ingresá como Director o Administrativo.';
  const detail=e?.error?.message || e?.error?.detail || e?.error?.error || '';
  if(typeof detail==='string' && detail.trim())return detail;
  if(e?.status===400)return 'Los datos fueron rechazados. Revisá DNI (6 a 12 números), correo, rol, fecha y asignaciones.';
  if(e?.status===409)return 'Ya hay una cuenta o ficha de personal con esos datos. Revisá el correo en la institución.';
  return `No se pudo guardar el personal (HTTP ${e?.status || 'sin conexión'}).`;
 }
 submitStaff():void {
  if(this.loading||this.loadFailed||this.busy)return;
  const email=this.form.email.trim();
  const dni=(this.form.documentNumber||'').trim();
  if(!this.form.firstName.trim()||!this.form.lastName.trim()){
   this.error='Completá el nombre y el apellido.';return;
  }
  if(!validEmail(email)){
   this.error='Ingresá un correo institucional válido.';return;
  }
  // Al crear una cuenta nueva, la clave temporal se deriva del DNI. La edición puede
  // conservar el documento existente aunque el formulario no lo haya modificado.
  if(!validNumericDni(this.form.documentNumber)){
   this.error='Ingresá un DNI de 6 a 12 dígitos para crear la cuenta inicial.';return;
  }
  if(!validNumericPhone(this.form.phone)){this.error='El teléfono debe tener solo números (6 a 20 dígitos).';return;}
  if(!['DIRECTOR','ADMINISTRATIVE','PRECEPTOR','TEACHER'].includes(this.form.role)){
   this.error='Seleccioná un rango válido para el personal.';return;
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(this.form.hireDate) ||
     Number.isNaN(Date.parse(this.form.hireDate+'T12:00:00'))){
   this.error='Indicá una fecha de alta válida.';return;
  }
  if(this.form.assignments.some(a=>!a.subject?.trim()||!a.classroom?.trim()||!['MANANA','TARDE'].includes(a.shift))){
   this.error='Completá materia, aula y turno válido en cada asignación.';return;
  }
  this.busy=true;this.error='';
  const payload: Teacher = toTeacherPayload(this.form);
  const op=this.editingId?this.api.updateStaff(this.editingId,payload):this.api.createStaff(payload);
  op.subscribe({
   next:(t)=>{this.busy=false;if(this.embedded)this.saved.emit(this.editingId||(t?.id||''));
     else this.router.navigate(this.editingId?['/teachers',this.editingId]:['/teachers']);},
   error:(e)=>{this.busy=false;this.error=this.backendError(e);}
  });
 }


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
