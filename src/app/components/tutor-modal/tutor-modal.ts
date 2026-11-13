import { notBlank } from '../../validators/form.validator';
import { ChangeDetectorRef } from '@angular/core';
import { validNumericDni, validNumericPhone } from '../../validators/identity.validator';
import { apiErrorMessage } from '../../utils/forms/api-error';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { FormGroupDirective } from '@angular/forms';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { signal, ViewChild, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { TutorService } from '../../services/tutor/tutor';
import { Tutor } from '../../models/tutor';
@Component({
  selector: 'app-tutor-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './tutor-modal.html',
  styleUrl: './tutor-modal.css'
})
export class TutorModal implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);
  private readonly dialogs = inject(UiDialogService);
  readonly canDiscardForm = canDiscardForm;
  @ViewChild(FormGroupDirective)
  private editableForm?: FormGroupDirective;
  async closeEditor(): Promise<void> {
    if (this.busy || (this.editableForm?.dirty &&
      !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios'))))
      return;
    this.formCdr.markForCheck();
    this.dismissed.emit();
  }
  @Input()
  existing: Tutor | null = null;
  @Input()
  existingTutors: Tutor[] = [];
  @Output()
  selectedExisting = new EventEmitter<Tutor>();
  duplicate: Tutor | null = null;
  @Output()
  saved = new EventEmitter<Tutor>();
  @Output()
  dismissed = new EventEmitter<void>();
  private readonly busyState = signal(false);
  get busy(): boolean {
    return this.busyState();
  }
  set busy(value: boolean) {
    this.busyState.set(value);
  }
  private readonly errorState = signal('');
  get error(): string {
    return this.errorState();
  }
  set error(value: string) {
    this.errorState.set(value);
  }
  tutorForm: FormGroup;
  firstName: FormControl;
  lastName: FormControl;
  documentNumber: FormControl;
  relationship: FormControl;
  phone: FormControl;
  email: FormControl;
  nacionalidad: FormControl;
  profesion: FormControl;
  condicionActividad: FormControl;
  convive: FormControl;
  direccion: FormControl;
  constructor(private api: TutorService) {
    this.firstName = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/)
      ]
    });
    this.lastName = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/)
      ]
    });
    this.documentNumber = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{6,8}$/)]
    });
    this.relationship = new FormControl<string>('MADRE', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.phone = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.pattern(/^(?:|[0-9]{6,20})$/)]
    });
    this.email = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        Validators.maxLength(30)
      ]
    });
    this.nacionalidad = new FormControl<string>('Argentina', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(255)]
    });
    this.profesion = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(255)]
    });
    this.condicionActividad = new FormControl<string>('EMPLEADO', {
      nonNullable: true,
      validators: [Validators.maxLength(255), notBlank, Validators.required]
    });
    this.convive = new FormControl<string>('SI', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.direccion = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(255)]
    });
    this.tutorForm = new FormGroup({
      firstName: this.firstName,
      lastName: this.lastName,
      documentNumber: this.documentNumber,
      relationship: this.relationship,
      phone: this.phone,
      email: this.email,
      nacionalidad: this.nacionalidad,
      profesion: this.profesion,
      condicionActividad: this.condicionActividad,
      convive: this.convive,
      direccion: this.direccion,
    });
  }
  ngOnInit(): void {
    if (this.existing)
      this.tutorForm.patchValue({
        ...this.blank(),
        ...this.existing
      });
  }
  useExisting(): void {
    if (this.duplicate)
      this.selectedExisting.emit(this.duplicate);
  }
  blank(): Tutor {
    return {
      firstName: '',
      lastName: '',
      documentNumber: '',
      relationship: 'MADRE',
      phone: '',
      email: '',
      nacionalidad: 'Argentina',
      profesion: '',
      condicionActividad: 'EMPLEADO',
      convive: 'SI',
      direccion: ''
    };
  }
  submit(): void {
    this.tutorForm.markAllAsTouched();
    if (this.tutorForm.invalid) {
      this.error = "Corregí los datos marcados en el formulario.";
      return;
    }
    if (this.busy)
      return;
    if (!this.firstName.value.trim() || !this.lastName.value.trim() || !this.documentNumber.value.trim()) {
      this.error = 'Completá nombre, apellido y DNI.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.value.trim())) {
      this.error = 'El correo es obligatorio para crear su usuario de acceso.';
      return;
    }
    const dni = this.documentNumber.value.trim();
    if (!validNumericDni(dni)) {
      this.error = 'El DNI debe tener solamente números (6 a 8 dígitos).';
      return;
    }
    if (!validNumericPhone(this.phone.value)) {
      this.error = 'El teléfono debe tener solamente números (6 a 20 dígitos).';
      return;
    }
    this.duplicate = this.existingTutors.find(t => !!t.documentNumber && t.documentNumber.replace(/\D/g, '') === dni && t.id !== this.existing?.id) || null;
    if (this.existingTutors.some(t => t.id !== this.existing?.id && String(t.email || '').trim().toLowerCase() === this.email.value.trim().toLowerCase())) {
      this.email.setErrors({
        duplicate: true
      });
      this.error = 'Ya existe un tutor con ese correo.';
      return;
    }
    if (this.duplicate) {
      this.error = 'Este DNI ya está registrado. Usá el tutor existente, sin duplicar el legajo.';
      return;
    }
    this.busy = true;
    this.error = '';
    const request = this.existing?.id ? this.api.updateTutor(this.existing.id, this.tutorForm.getRawValue()) : this.api.createTutor(this.tutorForm.getRawValue());
    request.subscribe({
      next: t => {
        this.busy = false;
        this.saved.emit(t);
      },
      error: e => {
        this.busy = false;
        this.error = e.status === 401 ? 'Tu sesión expiró o no tenés autorización. Volvé a iniciar sesión con Director o Administrativo.' :
          e.status === 409 ? apiErrorMessage(e, 'Ya existe un tutor con este correo o DNI. Elegilo desde el buscador') :
            (e?.error?.detail || e?.error?.message || `No se pudo guardar el tutor (HTTP ${e.status || 'sin conexión'}).`);
      }
    });
  }
  async confirmDiscard(form: {
    dirty?: boolean | null;
  } | null | undefined, target: string): Promise<void> {
    if (form?.dirty && !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios')))
      return;
    this.formCdr.markForCheck();
    if (target === 'dismissed') {
      (this as any).dismissed?.emit();
    }
    else {
      (this as any)[target] = false;
      this.formCdr.markForCheck();
    }
  }
}
