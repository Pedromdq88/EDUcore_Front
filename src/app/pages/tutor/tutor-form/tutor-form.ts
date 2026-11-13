import { notBlank } from '../../../validators/form.validator';
import { validNumericDni, validNumericPhone } from '../../../validators/identity.validator';
import { apiErrorMessage } from '../../../utils/forms/api-error';
import { signal, Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TutorService } from '../../../services/tutor/tutor';
import { Tutor } from '../../../models/tutor';
import { toTutorPayload } from '../../../mappers/tutor.mapper';
import { validEmail, validDni } from '../../../validators/identity.validator';
@Component({
  selector: 'app-tutor-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './tutor-form.html',
  styleUrl: './tutor-form.css'
})
export class TutorForm implements OnInit {
  editingId = '';
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
  private readonly loadingState = signal(false);
  get loading(): boolean {
    return this.loadingState();
  }
  set loading(value: boolean) {
    this.loadingState.set(value);
  }
  loadFailed = false;
  knownTutors: Tutor[] = [];
  tutorsLookupReady = false;
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
  constructor(private api: TutorService, private router: Router, private route: ActivatedRoute) {
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
    this.api.getTutors().subscribe({
      next: rows => {
        this.knownTutors = rows;
        this.tutorsLookupReady = true;
      },
      error: () => {
        this.tutorsLookupReady = false;
        this.error = 'No se pudo comprobar el DNI y el correo de los tutores.';
      }
    });
    this.editingId = this.route.snapshot.paramMap.get('id') || '';
    if (this.editingId) {
      this.loading = true;
      this.api.getTutors().subscribe({
        next: items => {
          const t = items.find(x => x.id === this.editingId);
          this.loading = false;
          if (t)
            this.tutorForm.patchValue({
              ...this.tutorForm.getRawValue(),
              ...t
            });
          else {
            this.loadFailed = true;
            this.error = 'No se encontró el tutor: no se pueden editar datos en blanco.';
          }
        },
        error: () => {
          this.loading = false;
          this.loadFailed = true;
          this.error = 'No se pudo cargar el tutor: edición bloqueada para evitar sobrescribir su ficha.';
        }
      });
    }
  }
  submitTutor(): void {
    if (this.busy)
      return;
    if (this.loading || this.loadFailed)
      return;
    this.tutorForm.markAllAsTouched();
    if (this.tutorForm.invalid) {
      this.error = 'Corregí los campos marcados en el formulario.';
      return;
    }
    if (!this.tutorsLookupReady) {
      this.error = 'No fue posible verificar la existencia de otros tutores.';
      return;
    }
    const dni = this.documentNumber.value.trim();
    const email = this.email.value.trim().toLowerCase();
    if (this.knownTutors.some(t => t.id !== this.editingId && String(t.documentNumber).trim() === dni)) {
      this.documentNumber.setErrors({
        duplicate: true
      });
      this.error = 'Este DNI ya pertenece a otro tutor. Buscá su ficha existente.';
      return;
    }
    if (this.knownTutors.some(t => t.id !== this.editingId && String(t.email || '').trim().toLowerCase() === email)) {
      this.email.setErrors({
        duplicate: true
      });
      this.error = 'Ya existe un tutor con ese correo.';
      return;
    }
    if (!this.firstName.value.trim() || !this.lastName.value.trim() || !this.documentNumber.value.trim()) {
      this.error = 'Completá nombre, apellido y DNI.';
      return;
    }
    if (!validEmail(this.email.value)) {
      this.error = 'El correo es obligatorio para crear su cuenta de tutor.';
      return;
    }
    if (!validNumericDni(this.documentNumber.value)) {
      this.error = 'Ingresá un DNI válido de 6 a 8 dígitos.';
      return;
    }
    if (!validNumericPhone(this.phone.value)) {
      this.error = 'El teléfono debe tener solo números (6 a 20 dígitos).';
      return;
    }
    this.busy = true;
    this.error = '';
    const payload = toTutorPayload(this.tutorForm.getRawValue());
    const op = this.editingId ? this.api.updateTutor(this.editingId, payload) : this.api.createTutor(payload);
    op.subscribe({
      next: (t) => {
        this.busy = false;
        this.router.navigate(this.editingId ? ['/tutors', this.editingId] : ['/tutors']);
      },
      error: e => {
        this.busy = false;
        this.error = apiErrorMessage(e, 'No se pudo guardar el tutor');
      }
    });
  }
}
