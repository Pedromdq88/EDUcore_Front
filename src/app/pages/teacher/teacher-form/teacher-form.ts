import { ChangeDetectorRef } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { FormGroupDirective } from '@angular/forms';
import { canDiscardForm } from '../../../utils/forms/form-ux';
import { validNumericDni, validNumericPhone } from '../../../validators/identity.validator';
import { ViewChild, Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TeacherService } from '../../../services/teacher/teacher';
import { ShiftService } from '../../../services/shift/shift';
import { SubjectService } from '../../../services/subjects/subjects';
import { Teacher } from '../../../models/teacher';
import { toTeacherPayload } from '../../../mappers/teacher.mapper';
import { validEmail, validDni } from '../../../validators/identity.validator';
@Component({
  selector: 'app-teacher-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './teacher-form.html',
  styleUrl: './teacher-form.css'
})
export class TeacherForm implements OnInit {
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
  embedded = false;
  @Input()
  staffId = '';
  @Output()
  saved = new EventEmitter<string>();
  @Output()
  dismissed = new EventEmitter<void>();
  editingId = '';
  classrooms = signal<any[]>([]);
  subjects = signal<any[]>([]);
  private readonly errorState = signal('');
  get error(): string {
    return this.errorState();
  }
  set error(value: string) {
    this.errorState.set(value);
  }
  private readonly busyState = signal(false);
  get busy(): boolean {
    return this.busyState();
  }
  set busy(value: boolean) {
    this.busyState.set(value);
  }
  private readonly loadingState = signal(false);
  get loading(): boolean {
    return this.loadingState();
  }
  set loading(value: boolean) {
    this.loadingState.set(value);
  }
  loadFailed = false;
  knownStaff: Teacher[] = [];
  staffLookupReady = false;
  staffForm: FormGroup;
  assignments: FormArray<FormGroup>;
  firstName: FormControl;
  lastName: FormControl;
  documentNumber: FormControl;
  email: FormControl;
  role: FormControl;
  phone: FormControl;
  hireDate: FormControl;
  classroom: FormControl;
  status: FormControl;
  get isDirector(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  constructor(private api: TeacherService, private shifts: ShiftService, private subjectsApi: SubjectService, private route: ActivatedRoute, private router: Router) {
    this.assignments = new FormArray<FormGroup>([]);
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
    this.email = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        Validators.maxLength(30)
      ]
    });
    this.role = new FormControl<string>('TEACHER', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.phone = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.pattern(/^(?:|[0-9]{6,20})$/)]
    });
    this.hireDate = new FormControl<string>(new Date().toISOString().slice(0, 10), {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]
    });
    this.classroom = new FormControl<string | null>(null, []);
    this.status = new FormControl<string>('ACTIVE', {
      nonNullable: true,
      validators: [Validators.maxLength(255)]
    });
    this.staffForm = new FormGroup({
      firstName: this.firstName,
      lastName: this.lastName,
      documentNumber: this.documentNumber,
      email: this.email,
      role: this.role,
      phone: this.phone,
      hireDate: this.hireDate,
      classroom: this.classroom,
      status: this.status,
      assignments: this.assignments,
    });
  }
  ngOnInit(): void {
    this.editingId = this.staffId || this.route.snapshot.paramMap.get('id') || '';
    this.api.getStaff().subscribe({
      next: rows => {
        this.knownStaff = rows;
        this.staffLookupReady = true;
      },
      error: () => {
        this.staffLookupReady = false;
      }
    });
    this.shifts.getClassroomsConfig().subscribe({
      next: r => this.classrooms.set(r),
      error: () => this.error = 'No se pudieron cargar las aulas.'
    });
    this.subjectsApi.getSubjects().subscribe({
      next: (r: any[]) => this.subjects.set(r),
      error: () => this.error = 'No se pudieron cargar las materias.'
    });
    if (this.editingId) {
      this.loading = true;
      this.api.getStaffById(this.editingId).subscribe({
        next: t => {
          this.loading = false;
          this.staffForm.patchValue(t);
          this.assignments.clear();
          for (const a of t.assignments || [])
            this.assignments.push(this.createAssignment(a));
        },
        error: () => {
          this.loading = false;
          this.loadFailed = true;
          this.error = 'No se pudo cargar el personal: no se pueden editar datos en blanco.';
        }
      });
    }
  }
  createAssignment(data: any = {}): FormGroup {
    const subject = new FormControl(data.subject || '', [Validators.required, Validators.maxLength(255)]);
    const classroom = new FormControl(data.classroom || '', [Validators.required, Validators.maxLength(255)]);
    const shift = new FormControl(data.shift || 'MANANA', [Validators.required]);
    const isClassroomTeacher = new FormControl(!!data.isClassroomTeacher);
    return new FormGroup({
      subject,
      classroom,
      shift,
      isClassroomTeacher
    });
  }
  addAssignment(): void {
    this.assignments.push(this.createAssignment());
  }
  removeAssignment(index: number): void {
    this.assignments.removeAt(index);
  }
  assignmentField(i: number, name: string): FormControl {
    return this.assignments.at(i).get(name) as FormControl;
  }
  private backendError(e: any): string {
    if (e?.status === 401)
      return 'Tu sesión venció o el servidor no reconoce el token. Volvé a iniciar sesión como Director o Administrativo.';
    if (e?.status === 403)
      return 'Tu cuenta no tiene permiso para registrar personal. Ingresá como Director o Administrativo.';
    const detail = e?.error?.message || e?.error?.detail || e?.error?.error || '';
    if (typeof detail === 'string' && detail.trim())
      return detail;
    if (e?.status === 400)
      return 'Los datos fueron rechazados. Revisá DNI (6 a 8 números), correo, rol, fecha y asignaciones.';
    if (e?.status === 409)
      return 'Ya hay una cuenta o ficha de personal con esos datos. Revisá el correo en la institución.';
    return `No se pudo guardar el personal (HTTP ${e?.status || 'sin conexión'}).`;
  }
  submitStaff(): void {
    if (this.loading || this.loadFailed || this.busy)
      return;
    this.staffForm.markAllAsTouched();
    if (this.staffForm.invalid) {
      this.error = 'Corregí los campos del personal y sus asignaciones.';
      return;
    }
    if (!this.staffLookupReady) {
      this.error = 'No fue posible comprobar DNI y correos del personal.';
      return;
    }
    const dniExistente = this.documentNumber.value.trim();
    const emailExistente = this.email.value.trim().toLowerCase();
    if (this.knownStaff.some(s => s.id !== this.editingId && String(s.documentNumber || '') === dniExistente)) {
      this.documentNumber.setErrors({
        duplicate: true
      });
      this.error = 'Ya existe personal con ese DNI.';
      return;
    }
    if (this.knownStaff.some(s => s.id !== this.editingId && String(s.email || '').toLowerCase() === emailExistente)) {
      this.email.setErrors({
        duplicate: true
      });
      this.error = 'Ya existe personal con ese correo.';
      return;
    }
    const duplicados = new Set<string>();
    for (const a of this.assignments.getRawValue()) {
      const key = [a['subject'], a['classroom'], a['shift']].join('|');
      if (duplicados.has(key)) {
        this.error = 'No se puede repetir una misma asignación de materia, aula y turno.';
        return;
      }
      duplicados.add(key);
    }
    const email = this.email.value.trim();
    const dni = (this.documentNumber.value || '').trim();
    if (!this.firstName.value.trim() || !this.lastName.value.trim()) {
      this.error = 'Completá el nombre y el apellido.';
      return;
    }
    if (!validEmail(email)) {
      this.error = 'Ingresá un correo institucional válido.';
      return;
    }
    if (!validNumericDni(this.documentNumber.value)) {
      this.error = 'Ingresá un DNI de 6 a 8 dígitos para crear la cuenta inicial.';
      return;
    }
    if (!validNumericPhone(this.phone.value)) {
      this.error = 'El teléfono debe tener solo números (6 a 20 dígitos).';
      return;
    }
    if (!['DIRECTOR', 'ADMINISTRATIVE', 'PRECEPTOR', 'TEACHER'].includes(this.role.value)) {
      this.error = 'Seleccioná un rango válido para el personal.';
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.hireDate.value) ||
      Number.isNaN(Date.parse(this.hireDate.value + 'T12:00:00'))) {
      this.error = 'Indicá una fecha de alta válida.';
      return;
    }
    if (this.assignments.getRawValue().some((a: any) => !a.subject?.trim() || !a.classroom?.trim() || !['MANANA', 'TARDE'].includes(a.shift))) {
      this.error = 'Completá materia, aula y turno válido en cada asignación.';
      return;
    }
    this.busy = true;
    this.error = '';
    const payload: Teacher = toTeacherPayload(this.staffForm.getRawValue());
    const op = this.editingId ? this.api.updateStaff(this.editingId, payload) : this.api.createStaff(payload);
    op.subscribe({
      next: (t) => {
        this.busy = false;
        if (this.embedded)
          this.saved.emit(this.editingId || (t?.id || ''));
        else
          this.router.navigate(this.editingId ? ['/teachers', this.editingId] : ['/teachers']);
      },
      error: (e) => {
        this.busy = false;
        this.error = this.backendError(e);
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
