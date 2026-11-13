import { ChangeDetectorRef } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../../utils/forms/form-ux';
import { validEmail, normalizedEmail } from '../../../validators/identity.validator';
import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { getMultiTenantHeaders } from '../../../services/tenant/tenant';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { from, concatMap, toArray, forkJoin } from 'rxjs';
import { FeeService } from '../../../services/fee/fee';
import { EmailVerificationService } from '../../../services/verification/email-verification';
import { StudentService } from '../../../services/student/student';
import { TenantService } from '../../../services/tenant/tenant';
@Component({
  selector: 'app-fee-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './fee-list.html',
  styleUrl: './fee-list.css'
})
export class FeeList implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);
  private readonly dialogs = inject(UiDialogService);
  readonly canDiscardForm = canDiscardForm;
  students = signal<any[]>([]);
  fees = signal<any[]>([]);
  queryControl: FormControl;
  classroomControl: FormControl;
  emailForm: FormGroup;
  receiptEmail: FormControl;
  feeQueryEmail: FormControl;
  receiptVerificationCode: FormControl;
  queryVerificationCode: FormControl;
  private selectedStudentState = signal('');
  get selectedStudentId(): string {
    return this.selectedStudentState();
  }
  set selectedStudentId(id: string) {
    this.selectedStudentState.set(id);
  }
  private academicYearState = signal(0);
  get academicYear(): number {
    return this.academicYearState();
  }
  set academicYear(value: number) {
    this.academicYearState.set(value);
  }
  private feesLoadingState = signal(false);
  get feesLoading(): boolean {
    return this.feesLoadingState();
  }
  set feesLoading(value: boolean) {
    this.feesLoadingState.set(value);
  }
  private requestId = 0;
  emails: any = {
    receiptEmail: '',
    feeQueryEmail: ''
  };
  private savedEmails: any = {
    receiptEmail: '',
    feeQueryEmail: ''
  };
  confirmedEmail: {
    receiptEmail: string;
    feeQueryEmail: string;
  } = {
      receiptEmail: '',
      feeQueryEmail: ''
    };
  emailVerificationBusy = false;
  emailVerificationMessage = '';
  private readonly errorState = signal('');
  get error(): string {
    return this.errorState();
  }
  set error(value: string) {
    this.errorState.set(value);
  }
  private readonly messageState = signal('');
  get message(): string {
    return this.messageState();
  }
  set message(value: string) {
    this.messageState.set(value);
  }
  loading = true;
  private readonly busyState = signal(false);
  get busy(): boolean {
    return this.busyState();
  }
  set busy(value: boolean) {
    this.busyState.set(value);
  }
  private readonly emailBusyState = signal(false);
  get emailBusy(): boolean {
    return this.emailBusyState();
  }
  set emailBusy(value: boolean) {
    this.emailBusyState.set(value);
  }
  editMode = false;
  showEmailModal = false;
  private pending = new Set<number>();
  months = [{
    number: 0,
    name: 'Matrícula'
  }, ...[
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic'
  ].map((name, i) => ({
    number: i + 1,
    name
  }))];
  constructor(private studentsApi: StudentService, private feesApi: FeeService, private school: TenantService, private http: HttpClient, private route: ActivatedRoute, private emailVerification: EmailVerificationService) {
    this.queryControl = new FormControl('', {
      nonNullable: true
    });
    this.classroomControl = new FormControl('ALL', {
      nonNullable: true
    });
    this.receiptEmail = new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        Validators.maxLength(30)
      ]
    });
    this.feeQueryEmail = new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        Validators.maxLength(30)
      ]
    });
    this.receiptVerificationCode = new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^(?:|[0-9]{6})$/)]
    });
    this.queryVerificationCode = new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^(?:|[0-9]{6})$/)]
    });
    this.emailForm = new FormGroup({
      receiptEmail: this.receiptEmail,
      feeQueryEmail: this.feeQueryEmail,
      receiptVerificationCode: this.receiptVerificationCode,
      queryVerificationCode: this.queryVerificationCode
    });
    this.receiptEmail.valueChanges.subscribe(() => this.onEmailEdited('receiptEmail'));
    this.feeQueryEmail.valueChanges.subscribe(() => this.onEmailEdited('feeQueryEmail'));
  }
  get isTutor(): boolean {
    return sessionStorage.getItem('current_user_role') === 'TUTOR';
  }
  readonly copyEmailStatus = signal('');
  async copyPaymentEmail(email: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(email);
      this.copyEmailStatus.set('Correo copiado: ' + email);
    } catch {
      this.copyEmailStatus.set('No se pudo copiar. Podés seleccionar la dirección y copiarla.');
    }
  }
  get canEdit(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  get rooms(): string[] {
    return [...new Set(this.activeStudents.map(s => s.classroom).filter(Boolean))].sort();
  }
  get activeStudents(): any[] {
    return this.students().filter(s => !this.academicYear || Number(s.academicYear) === this.academicYear);
  }
  get filteredStudents(): any[] {
    const q = this.queryControl.value.trim().toLocaleLowerCase('es');
    return this.activeStudents.filter(s => (this.classroomControl.value === 'ALL' || s.classroom === this.classroomControl.value) && (!q || [s.firstName, s.lastName, s.documentNumber, s.classroom].join(' ').toLocaleLowerCase('es').includes(q)));
  }
  get selectedStudent(): any {
    return this.activeStudents.find(s => s.id === this.selectedStudentId);
  }
  get pendingCount(): number {
    return this.pending.size;
  }
  ngOnInit(): void {
    const source = this.isTutor
      ? this.http.get<any[]>('/api/v1/auth/my-students', {
        headers: getMultiTenantHeaders()
      })
      : this.studentsApi.getStudents();
    forkJoin({
      profile: this.school.getProfile(),
      students: source
    }).subscribe({
      next: ({ profile, students }) => {
        const year = Number((profile.profile || profile).academicYear);
        this.academicYear = year;
        this.loading = false;
        this.students.set(students);
        const requestedId = this.route.snapshot.queryParamMap.get('studentId');
        if (requestedId && students.some(s => s.id === requestedId) && Number.isInteger(year) && year > 2000) {
          this.openStudent(requestedId);
        }
        if (!Number.isInteger(year) || year < 2000)
          this.error = 'La escuela no tiene un ciclo lectivo válido.';
      },
      error: e => {
        this.loading = false;
        this.error = this.readError(e, 'No se pudieron cargar el ciclo lectivo y los alumnos.');
      }
    });
    this.feesApi.getInstitutionalEmails().subscribe({
      next: e => {
        this.emails = {
          ...this.emails,
          ...e
        };
        this.savedEmails = {
          ...this.emails
        };
        this.emailForm.patchValue(this.emails, {
          emitEvent: false
        });
      },
      error: () => { }
    });
  }
  openStudent(id: string): void {
    if (!this.academicYear || this.loading) {
      this.error = 'Esperá a que cargue el ciclo lectivo de la institución.';
      return;
    }
    this.selectedStudentId = id;
    this.editMode = false;
    this.pending.clear();
    this.loadFees();
  }
  async closeStudent(): Promise<void> {
    if (this.pending.size > 0 && !(await this.dialogs.confirm('Tenés cambios de cuotas sin guardar. ¿Querés descartarlos?')))
      return;
    ++this.requestId;
    this.selectedStudentId = '';
    this.editMode = false;
    this.pending.clear();
    this.feesLoading = false;
    this.fees.set([]);
    this.message = '';
  }
  loadFees(): void {
    if (!this.selectedStudentId || !this.academicYear)
      return;
    const request = ++this.requestId;
    const student = this.selectedStudentId;
    const year = this.academicYear;
    this.feesLoading = true;
    this.error = '';
    this.fees.set([]);
    this.feesApi.getStudentFees(student, year).subscribe({
      next: items => {
        if (request !== this.requestId)
          return;
        this.fees.set(items);
        this.feesLoading = false;
      },
      error: e => {
        if (request !== this.requestId)
          return;
        this.feesLoading = false;
        this.error = this.readError(e, 'No se pudieron consultar las cuotas.');
      }
    });
  }
  feeFor(number: number): any {
    return this.fees().find(f => Number(f.monthNumber) === number);
  }
  statusFor(number: number): string {
    const f = this.feeFor(number);
    if (!f)
      return 'INACTIVE';
    if (this.pending.has(number))
      return f.status === 'PAID' ? 'PENDING' : 'PAID';
    return String(f.status || 'INACTIVE').toUpperCase();
  }
  togglePreview(number: number): void {
    if (!Number.isInteger(number) || number < 0 || number > 12)
      return;
    if (!this.editMode || !this.canEdit || this.busy)
      return;
    if (this.pending.has(number))
      this.pending.delete(number);
    else
      this.pending.add(number);
  }
  async cancelEdit(ask = true): Promise<void> {
    if (ask && this.pending.size > 0 && !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?')))
      return;
    this.editMode = false;
    this.pending.clear();
  }
  savePayments(): void {
    if (!this.canEdit || this.busy || !this.selectedStudentId)
      return;
    if (!Number.isInteger(this.academicYear) || this.academicYear < 2000 || this.academicYear > 2100) {
      this.error = 'El ciclo lectivo debe estar entre 2000 y 2100.';
      return;
    }
    const changes = [...this.pending];
    if (changes.some(month => !Number.isInteger(month) || month < 0 || month > 12))
      return;
    if (!changes.length) {
      this.cancelEdit();
      return;
    }
    this.busy = true;
    this.error = '';
    this.message = '';
    from(changes).pipe(concatMap(month => this.feesApi.toggleStudentFee(this.selectedStudentId, this.academicYear, month)), toArray()).subscribe({
      next: () => {
        this.busy = false;
        this.message = 'Se guardaron los cambios de pagos.';
        this.cancelEdit(false);
        this.loadFees();
      },
      error: e => {
        this.busy = false;
        this.cancelEdit(false);
        this.loadFees();
        this.error = this.readError(e, 'No se pudieron guardar todos los pagos. Se recargó el estado real; verificá los meses antes de reintentar.');
      }
    });
  }
  openEmailModal(): void {
    this.emailForm.reset();
    this.emailForm.patchValue(this.savedEmails, {
      emitEvent: false
    });
    this.error = '';
    this.emailVerificationMessage = '';
    this.confirmedEmail = {
      receiptEmail: '',
      feeQueryEmail: ''
    };
    this.showEmailModal = true;
  }
  needsEmailVerification(field: 'receiptEmail' | 'feeQueryEmail'): boolean {
    const entered = normalizedEmail(String(this.emailForm.get(field)?.value || ''));
    return !!entered && entered !== normalizedEmail(String(this.savedEmails[field] || ''));
  }
  isEmailVerified(field: 'receiptEmail' | 'feeQueryEmail'): boolean {
    const entered = normalizedEmail(String(this.emailForm.get(field)?.value || ''));
    return !this.needsEmailVerification(field) || Object.values(this.confirmedEmail).includes(entered);
  }
  onEmailEdited(field: 'receiptEmail' | 'feeQueryEmail'): void {
    this.emailVerificationMessage = '';
    this.error = '';
    this.confirmedEmail[field] = '';
    (field === 'receiptEmail' ? this.receiptVerificationCode : this.queryVerificationCode).setValue('');
  }
  requestEmailVerification(field: 'receiptEmail' | 'feeQueryEmail'): void {
    if (this.emailVerificationBusy || this.emailBusy)
      return;
    const address = normalizedEmail(String(this.emailForm.get(field)?.value || ''));
    if (!validEmail(address)) {
      this.error = 'Completá primero un correo válido.';
      return;
    }
    this.emailVerificationBusy = true;
    this.error = '';
    this.emailVerificationMessage = '';
    this.emailVerification.request(address).subscribe({
      next: () => {
        this.emailVerificationBusy = false;
        this.emailVerificationMessage = `El código fue enviado a ${address}. Revisá tu bandeja de entrada y la carpeta de spam. Vence en 10 minutos.`;
        this.formCdr.markForCheck();
      },
      error: e => {
        this.emailVerificationBusy = false;
        this.error = this.readError(e, 'No se pudo enviar el código de verificación.');
        this.formCdr.markForCheck();
      }
    });
  }
  confirmEmailVerification(field: 'receiptEmail' | 'feeQueryEmail'): void {
    if (this.emailVerificationBusy || this.emailBusy)
      return;
    const address = normalizedEmail(String(this.emailForm.get(field)?.value || ''));
    const code = (field === 'receiptEmail' ? this.receiptVerificationCode.value : this.queryVerificationCode.value).trim();
    if (!/^[0-9]{6}$/.test(code)) {
      this.error = 'Ingresá los seis números del código recibido por correo.';
      return;
    }
    this.emailVerificationBusy = true;
    this.error = '';
    this.emailVerificationMessage = '';
    this.emailVerification.confirm(address, code).subscribe({
      next: result => {
        this.emailVerificationBusy = false;
        if (result.valid)
          this.confirmedEmail[field] = address;
        else
          this.error = result.message;
        this.emailVerificationMessage = result.valid ? result.message : '';
        this.formCdr.markForCheck();
      },
      error: e => {
        this.emailVerificationBusy = false;
        this.error = this.readError(e, 'No se pudo verificar el código.');
        this.formCdr.markForCheck();
      }
    });
  }
  async closeEmailModal(): Promise<void> {
    if (this.emailBusy || (this.emailForm.dirty &&
      !(await this.dialogs.confirm('Tenés correos modificados sin guardar. ¿Querés descartarlos?', 'Descartar cambios'))))
      return;
    this.emailForm.reset();
    this.emailVerificationMessage = '';
    this.showEmailModal = false;
    this.formCdr.markForCheck();
  }
  saveEmails(): void {
    this.emailForm.markAllAsTouched();
    if (this.emailBusy || !this.canEdit)
      return;
    if (this.emailForm.invalid) {
      this.error = 'Revisá ambos correos y los códigos ingresados.';
      return;
    }
    const receiptEmail = normalizedEmail(this.receiptEmail.value.trim());
    const feeQueryEmail = normalizedEmail(this.feeQueryEmail.value.trim());
    if (!this.isEmailVerified('receiptEmail') || !this.isEmailVerified('feeQueryEmail')) {
      this.error = 'Antes de guardar los correos nuevos, enviá y confirmá los códigos recibidos.';
      return;
    }
    const emails = {
      receiptEmail,
      feeQueryEmail
    };
    this.emailBusy = true;
    this.error = '';
    this.message = '';
    this.feesApi.updateInstitutionalEmails(emails).subscribe({
      next: () => {
        this.emailBusy = false;
        this.emails = {
          ...emails
        };
        this.savedEmails = {
          ...emails
        };
        this.showEmailModal = false;
        this.message = 'Correos institucionales actualizados.';
      },
      error: e => {
        this.emailBusy = false;
        this.error = this.readError(e, 'No se pudieron guardar los correos.');
      }
    });
  }
  readError(e: any, fallback: string): string {
    return e?.error?.message || e?.error?.detail || `${fallback} (HTTP ${e?.status || 'sin conexión'})`;
  }
}
