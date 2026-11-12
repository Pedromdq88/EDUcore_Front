import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { validNumericDni, validNumericPhone } from '../../validators/identity.validator';
import { apiErrorMessage } from '../../utils/forms/api-error';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { NgForm } from '@angular/forms';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { ValidateSubmitDirective } from '../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../utils/forms/field-validation.directive';
import { signal, ViewChild, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TutorService } from '../../services/tutor/tutor';
import { Tutor } from '../../models/tutor';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-tutor-modal',standalone:true,imports: [FieldValidationDirective, ValidateSubmitDirective, FormsModule],templateUrl:'./tutor-modal.html',styleUrl:'./tutor-modal.css'})
export class TutorModal implements OnInit {
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
  @Input() existing: Tutor | null = null;
  @Input() existingTutors: Tutor[]=[];
  @Output() selectedExisting=new EventEmitter<Tutor>();
  duplicate:Tutor|null=null;
  @Output() saved = new EventEmitter<Tutor>();
  @Output() dismissed = new EventEmitter<void>();
  private readonly busyState = signal(false);
  get busy(): boolean {return this.busyState();}
  set busy(value: boolean) {this.busyState.set(value);}
   private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
  
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
    const dni=this.form.documentNumber.trim();
    if(!validNumericDni(dni)){this.error='El DNI debe tener solamente números (6 a 12 dígitos).';return;}
    if(!validNumericPhone(this.form.phone)){this.error='El teléfono debe tener solamente números (6 a 20 dígitos).';return;}
    this.duplicate=this.existingTutors.find(t=>!!t.documentNumber && t.documentNumber.replace(/\D/g,'')===dni && t.id!==this.existing?.id)||null;
    if(this.duplicate){this.error='Este DNI ya está registrado. Usá el tutor existente, sin duplicar el legajo.';return;}
    this.busy=true;this.error='';
    const request=this.existing?.id?this.api.updateTutor(this.existing.id,this.form):this.api.createTutor(this.form);
    request.subscribe({next:t=>{this.busy=false;this.saved.emit(t);},error:e=>{this.busy=false;
      this.error=e.status===401?'Tu sesión expiró o no tenés autorización. Volvé a iniciar sesión con Director o Administrativo.':
        e.status===409?apiErrorMessage(e,'Ya existe un tutor con este correo o DNI. Elegilo desde el buscador'):
        (e?.error?.detail||e?.error?.message||`No se pudo guardar el tutor (HTTP ${e.status||'sin conexión'}).`);
    }});
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
