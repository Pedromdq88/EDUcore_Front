import { studentOptionalRules } from '../../../validators/student-optional.validator';
import { Student } from '../../../models/student';
import { integer, siblingCounts } from '../../../validators/form.validator';
import { ChangeDetectorRef } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { FormGroupDirective } from '@angular/forms';
import { validNumericDni, validNumericPhone } from '../../../validators/identity.validator';
import { canDiscardForm } from '../../../utils/forms/form-ux';
import { toStudentTutorAssignments } from '../../../mappers/tutor.mapper';
import { ViewChild, Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { validStudentBirthDate, studentAgeAtCutoff } from '../../../utils/classroom-date';
import { TutorModal } from '../../../components/tutor-modal/tutor-modal';
import { StudentService } from '../../../services/student/student';
import { TutorService } from '../../../services/tutor/tutor';
import { TenantService } from '../../../services/tenant/tenant';
import { ShiftService } from '../../../services/shift/shift';
interface RoomOption {
  id: string;
  name: string;
  minimumAge: number;
  shift: string;
}
interface RoomEligibility {
  ageAtCutoff: number | null;
  cutoffDate: string;
  options: RoomOption[];
  message: string;
}
@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TutorModal],
  templateUrl: './student-form.html',
  styleUrl: './student-form.css'
})
export class StudentForm implements OnInit {
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
  studentId = '';
  @Output()
  saved = new EventEmitter<string>();
  @Output()
  dismissed = new EventEmitter<void>();
  tutors = signal<any[]>([]);
  existingStudents = signal<Student[]>([]);
  knownStudents: any[] = [];
  studentsLookupReady = false;
  eligibility = signal<RoomEligibility | null>(null);
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
  private readonly messageState = signal('');
  get message(): string {
    return this.messageState();
  }
  set message(value: string) {
    this.messageState.set(value);
  }
  loadingStudent = false;
  studentLoadFailed = false;
  roomLoading = false;
  private roomRequest = 0;
  birthDateError = '';
  allClassrooms: RoomOption[] = [];
  newTutorOpen = false;
  tutorOne = '';
  tutorTwo = '';
  tutorSearch: FormControl;
  activeYearLoading = true;
  primarySelectionRequired = false;
  tutorDropdown: 1 | 2 | 0 = 0;
  get selectedTutorOne(): any {
    return this.tutors().find(t => t.id === this.tutorOne);
  }
  get selectedTutorTwo(): any {
    return this.tutors().find(t => t.id === this.tutorTwo);
  }
  get possibleSiblings(): Student[] {
    const selected = [this.tutorOne, this.tutorTwo].filter(Boolean);
    return selected.length ? this.existingStudents().filter(student => student.id !== this.editingId && (student.tutors || []).some(tutor => selected.includes(tutor.id))) : [];
  }
  toggleTutorPicker(which: 1 | 2): void {
    this.tutorSearch.setValue('');
    this.tutorDropdown = this.tutorDropdown === which ? 0 : which;
  }
  chooseTutor(which: 1 | 2, id: string): void {
    if (which === 1) {
      if (this.tutorTwo === id)
        this.tutorTwo = '';
      this.tutorOne = id;
      this.primarySelectionRequired = false;
    }
    else if (!this.tutorOne) {
      this.tutorOne = id;
      this.primarySelectionRequired = false;
    }
    else {
      if (this.tutorOne === id)
        this.tutorOne = '';
      this.tutorTwo = id;
    }
    this.tutorDropdown = 0;
    this.tutorSearch.setValue('');
  }
  clearTutor(which: 1 | 2): void {
    if (which === 1) {
      this.tutorOne = this.tutorTwo;
      this.tutorTwo = '';
      if (this.tutorOne)
        this.primarySelectionRequired = false;
    }
    else
      this.tutorTwo = '';
    this.tutorDropdown = 0;
  }
  get matchingTutors(): any[] {
    return this.selectableTutors.filter(t => t.id !== (this.tutorDropdown === 1 ? this.tutorTwo : this.tutorOne));
  }
  get selectableTutors(): any[] {
    const q = this.tutorSearch.value.trim().toLocaleLowerCase('es');
    const seen = new Set<string>();
    return this.tutors().filter(t => {
      const key = (t.documentNumber || '').replace(/\D/g, '') || t.id;
      if (seen.has(key))
        return false;
      seen.add(key);
      return !q || [t.firstName, t.lastName, t.documentNumber].join(' ').toLocaleLowerCase('es').includes(q);
    });
  }
  get tutorTwoOptions(): any[] {
    return this.selectableTutors.filter(t => t.id !== this.tutorOne || t.id === this.tutorTwo);
  }
  get tutorOneOptions(): any[] {
    return this.selectableTutors.filter(t => t.id !== this.tutorTwo || t.id === this.tutorOne);
  }
  chooseExistingTutor(t: any): void {
    if (!this.tutorOne)
      this.tutorOne = t.id;
    else if (!this.tutorTwo && this.tutorOne !== t.id)
      this.tutorTwo = t.id;
    this.newTutorOpen = false;
    this.tutorDropdown = 0;
  }
  studentForm: FormGroup;
  firstName: FormControl;
  lastName: FormControl;
  documentNumber: FormControl;
  legajoNumber: FormControl;
  birthDate: FormControl;
  classroom: FormControl;
  studentShift: FormControl;
  academicYear: FormControl;
  status: FormControl;
  cuil: FormControl;
  dniStatus: FormControl;
  hasCpi: FormControl;
  hasForeignDocument: FormControl;
  foreignDocumentType: FormControl;
  foreignDocumentNumber: FormControl;
  genderIdentity: FormControl;
  birthCountry: FormControl;
  nationality: FormControl;
  birthProvince: FormControl;
  birthDistrict: FormControl;
  birthLocality: FormControl;
  street: FormControl;
  streetNumber: FormControl;
  floor: FormControl;
  tower: FormControl;
  apartment: FormControl;
  betweenStreets: FormControl;
  addressDistrict: FormControl;
  addressLocality: FormControl;
  otherAddressDetails: FormControl;
  studentLandlinePhone: FormControl;
  studentCellphone: FormControl;
  hasSiblings: FormControl;
  siblingCount: FormControl;
  siblingsInThisSchool: FormControl;
  receivesAuh: FormControl;
  belongsToNativePeople: FormControl;
  speaksOtherLanguageAtHome: FormControl;
  indigenousLanguage: FormControl;
  otherLanguage: FormControl;
  transportationMethods: FormControl;
  gender: FormControl;
  bloodType: FormControl;
  healthInsurance: FormControl;
  allergies: FormControl;
  birthPlace: FormControl;
  address: FormControl;
  constructor(private students: StudentService, private tutorApi: TutorService, private tenantApi: TenantService, private shifts: ShiftService, private route: ActivatedRoute, private router: Router) {
    this.tutorSearch = new FormControl<string>('', {
      nonNullable: true
    });
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
      validators: [Validators.pattern(/^(?:|[0-9]{6,8})$/)]
    });
    this.legajoNumber = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.legajoNumber.validators
    });
    this.birthDate = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.classroom = new FormControl<string>({ value: '', disabled: true }, {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.studentShift = new FormControl<string>('MANANA', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(MANANA|TARDE)$/)]
    });
    this.academicYear = new FormControl<number>(new Date().getFullYear(), {
      nonNullable: true,
      validators: [integer, Validators.required, Validators.min(2000), Validators.max(2100)]
    });
    this.status = new FormControl<string>('ACTIVE', {
      nonNullable: true,
      validators: [Validators.maxLength(255)]
    });
    this.cuil = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.cuil.validators
    });
    this.dniStatus = new FormControl<string>('FISICO', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.hasCpi = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.hasForeignDocument = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.foreignDocumentType = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.foreignDocumentType.validators
    });
    this.foreignDocumentNumber = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.foreignDocumentNumber.validators
    });
    this.genderIdentity = new FormControl<string>('NO_RESPONDE', {
      nonNullable: true,
      validators: [Validators.maxLength(255)]
    });
    this.birthCountry = new FormControl<string>('ARGENTINA', {
      nonNullable: true,
      validators: [Validators.maxLength(255)]
    });
    this.nationality = new FormControl<string>('Argentina', {
      nonNullable: true,
      validators: studentOptionalRules.nationality.validators
    });
    this.birthProvince = new FormControl<string>('Buenos Aires', {
      nonNullable: true,
      validators: studentOptionalRules.birthProvince.validators
    });
    this.birthDistrict = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.birthDistrict.validators
    });
    this.birthLocality = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.birthLocality.validators
    });
    this.street = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.street.validators
    });
    this.streetNumber = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.streetNumber.validators
    });
    this.floor = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.floor.validators
    });
    this.tower = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.tower.validators
    });
    this.apartment = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.apartment.validators
    });
    this.betweenStreets = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.betweenStreets.validators
    });
    this.addressDistrict = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.addressDistrict.validators
    });
    this.addressLocality = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.addressLocality.validators
    });
    this.otherAddressDetails = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.otherAddressDetails.validators
    });
    this.studentLandlinePhone = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.studentLandlinePhone.validators
    });
    this.studentCellphone = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.studentCellphone.validators
    });
    this.hasSiblings = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.siblingCount = new FormControl<number>(0, {
      nonNullable: true,
      validators: [integer, Validators.min(0), Validators.max(30)]
    });
    this.siblingsInThisSchool = new FormControl<number>(0, {
      nonNullable: true,
      validators: [integer, Validators.min(0), Validators.max(30)]
    });
    this.receivesAuh = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.belongsToNativePeople = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.speaksOtherLanguageAtHome = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.indigenousLanguage = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.otherLanguage = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.transportationMethods = new FormControl<string>('A_PIE', {
      nonNullable: true,
      validators: studentOptionalRules.transportationMethods.validators
    });
    this.gender = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.gender.validators
    });
    this.bloodType = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.bloodType.validators
    });
    this.healthInsurance = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.healthInsurance.validators
    });
    this.allergies = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.allergies.validators
    });
    this.birthPlace = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.birthPlace.validators
    });
    this.address = new FormControl<string>('', {
      nonNullable: true,
      validators: studentOptionalRules.address.validators
    });
    this.studentForm = new FormGroup({
      firstName: this.firstName,
      lastName: this.lastName,
      documentNumber: this.documentNumber,
      legajoNumber: this.legajoNumber,
      birthDate: this.birthDate,
      classroom: this.classroom,
      studentShift: this.studentShift,
      academicYear: this.academicYear,
      status: this.status,
      cuil: this.cuil,
      dniStatus: this.dniStatus,
      hasCpi: this.hasCpi,
      hasForeignDocument: this.hasForeignDocument,
      foreignDocumentType: this.foreignDocumentType,
      foreignDocumentNumber: this.foreignDocumentNumber,
      genderIdentity: this.genderIdentity,
      birthCountry: this.birthCountry,
      nationality: this.nationality,
      birthProvince: this.birthProvince,
      birthDistrict: this.birthDistrict,
      birthLocality: this.birthLocality,
      street: this.street,
      streetNumber: this.streetNumber,
      floor: this.floor,
      tower: this.tower,
      apartment: this.apartment,
      betweenStreets: this.betweenStreets,
      addressDistrict: this.addressDistrict,
      addressLocality: this.addressLocality,
      otherAddressDetails: this.otherAddressDetails,
      studentLandlinePhone: this.studentLandlinePhone,
      studentCellphone: this.studentCellphone,
      hasSiblings: this.hasSiblings,
      siblingCount: this.siblingCount,
      siblingsInThisSchool: this.siblingsInThisSchool,
      receivesAuh: this.receivesAuh,
      belongsToNativePeople: this.belongsToNativePeople,
      speaksOtherLanguageAtHome: this.speaksOtherLanguageAtHome,
      indigenousLanguage: this.indigenousLanguage,
      otherLanguage: this.otherLanguage,
      transportationMethods: this.transportationMethods,
      gender: this.gender,
      bloodType: this.bloodType,
      healthInsurance: this.healthInsurance,
      allergies: this.allergies,
      birthPlace: this.birthPlace,
      address: this.address,
    }, {
      validators: siblingCounts
    });
    this.dniStatus.valueChanges.subscribe(() => this.updateDniValidators());
    this.updateDniValidators();
    this.birthCountry.setValidators(Validators.pattern(/^(ARGENTINA|EXTRANJERO)$/));
    this.genderIdentity.setValidators(Validators.pattern(/^(MUJER|VARON|MUJER_TRANS|VARON_TRANS|NO_BINARIO|OTRA|NO_RESPONDE)$/));
    this.hasForeignDocument.valueChanges.subscribe(() => this.syncForeignDocument());
    this.syncForeignDocument();
  }
  readonly optionalRules = studentOptionalRules;
  optionalFieldError(field: keyof typeof studentOptionalRules): string {
    const control = this.studentForm.get(field)!;
    if (!control.touched || !control.errors) return '';
    if (control.hasError('duplicate')) return 'Ya existe un alumno con este legajo.';
    if (control.hasError('spaces')) return 'Completá el dato o dejalo vacío; no ingreses solo espacios.';
    if (control.hasError('maxlength')) return `Máximo ${studentOptionalRules[field].max} caracteres.`;
    return studentOptionalRules[field].hint;
  }
  private syncForeignDocument(): void {
    for (const control of [this.foreignDocumentType, this.foreignDocumentNumber]) {
      if (this.hasForeignDocument.value) control.enable({ emitEvent: false });
      else control.disable({ emitEvent: false });
    }
  }
  get isEdit(): boolean {
    return !!this.editingId;
  }
  updateDniValidators(): void {
    if (this.dniStatus.value === 'FISICO') {
      this.documentNumber.setValidators([Validators.required, Validators.pattern(/^[0-9]{6,8}$/)]);
    }
    else {
      this.documentNumber.setValidators([Validators.pattern(/^(?:|[0-9]{6,8})$/)]);
    }
    this.documentNumber.updateValueAndValidity({
      emitEvent: false
    });
  }
  ngOnInit(): void {
    this.editingId = this.studentId || this.route.snapshot.paramMap.get('id') || '';
    this.tenantApi.getProfile().subscribe({
      next: p => {
        const year = Number((p.profile || p)?.academicYear);
        if (year >= 2000 && year <= 2100 && !this.isEdit) {
          this.academicYear.setValue(year);
          this.refreshClassrooms();
        }
        this.activeYearLoading = false;
        this.formCdr.markForCheck();
      },
      error: () => {
        this.activeYearLoading = false;
        this.error = 'No se pudo recuperar el ciclo lectivo activo de la escuela.';
        this.formCdr.markForCheck();
      }
    });
    this.shifts.getClassroomsConfig().subscribe({
      next: rooms => {
        this.allClassrooms = rooms;
        this.syncClassroomState();
        this.formCdr.markForCheck();
      },
      error: () => {
        if (this.isEdit)
          this.error = 'No se pudieron cargar las aulas registradas.';
      }
    });
    this.students.getStudents().subscribe({
      next: rows => {
        this.knownStudents = rows;
        this.existingStudents.set(rows);
        this.studentsLookupReady = true;
      },
      error: () => {
        this.studentsLookupReady = false;
        this.error = 'No se pudo verificar la existencia de alumnos registrados.';
      }
    });
    this.tutorApi.getTutors().subscribe({
      next: rows => {
        this.tutors.set(rows);
        this.formCdr.markForCheck();
      },
      error: e => {
        this.error = this.errorText(e, 'No se pudieron cargar los tutores');
        this.formCdr.markForCheck();
      }
    });
    if (this.isEdit) {
      this.loadingStudent = true;
      this.students.getStudentById(this.editingId).subscribe({
        next: s => {
          this.studentForm.patchValue({
            ...this.studentForm.getRawValue(),
            ...s,
            birthDate: (s.birthDate || '').substring(0, 10),
            studentShift: s.studentShift || this.studentShift.value,
            academicYear: s.academicYear || this.academicYear.value
          });
          this.tutorOne = s.tutors?.[0]?.id || '';
          this.tutorTwo = s.tutors?.[1]?.id || '';
          this.primarySelectionRequired = !!(this.tutorTwo && !s.primaryTutorId);
          this.loadingStudent = false;
          this.refreshClassrooms();
          this.formCdr.markForCheck();
        },
        error: e => {
          this.loadingStudent = false;
          this.studentLoadFailed = true;
          this.error = this.errorText(e, 'No se pudo cargar la ficha existente; no se permite editar en blanco');
          this.formCdr.markForCheck();
        }
      });
    }
  }
  get previewAge(): number | null {
    return studentAgeAtCutoff(this.birthDate.value, Number(this.academicYear.value));
  }
  get rooms(): RoomOption[] {
    return this.eligibility()?.options || [];
  }
  get selectableClassrooms(): RoomOption[] {
    if (!this.isEdit)
      return this.rooms;
    return this.allClassrooms.filter(room => !this.studentShift.value || room.shift === this.studentShift.value || room.shift === 'AMBOS');
  }
  isRecommendedClassroom(name: string): boolean {
    return this.rooms.some(room => room.name === name);
  }
  get calculatedAge(): number | null {
    return this.eligibility()?.ageAtCutoff ?? null;
  }
  get canSubmit(): boolean {
    return !this.activeYearLoading && !this.busy && !this.loadingStudent && !this.studentLoadFailed && !this.roomLoading && this.selectableClassrooms.some(r => r.name === this.classroom.value);
  }
  refreshClassrooms(): void {
    const birthDate = this.birthDate.value;
    const year = Number(this.academicYear.value);
    const shift = this.studentShift.value;
    const request = ++this.roomRequest;
    this.eligibility.set(null);
    this.birthDateError = '';
    if (!birthDate || !year || !shift) {
      this.roomLoading = false;
      this.syncClassroomState();
      return;
    }
    this.birthDateError = validStudentBirthDate(birthDate, year);
    if (this.birthDateError) {
      this.roomLoading = false;
      this.syncClassroomState();
      return;
    }
    this.roomLoading = true;
    this.syncClassroomState();
    this.students.getClassroomOptions(birthDate, year, shift).subscribe({
      next: info => {
        if (request !== this.roomRequest)
          return;
        this.eligibility.set(info);
        if (!this.isEdit && !info.options.some(o => o.name === this.classroom.value))
          this.classroom.setValue(this.isEdit ? '' : (info.options[0]?.name || ''));
        this.roomLoading = false;
        this.syncClassroomState();
        this.formCdr.markForCheck();
      },
      error: e => {
        if (request !== this.roomRequest)
          return;
        this.eligibility.set({
          ageAtCutoff: null,
          cutoffDate: '',
          options: [],
          message: this.errorText(e, 'No se pudo calcular la sala')
        });
        if (!this.isEdit)
          this.classroom.setValue('');
        this.roomLoading = false;
        this.syncClassroomState();
        this.formCdr.markForCheck();
      }
    });
  }
  private syncClassroomState(): void {
    const disabled = this.roomLoading || this.selectableClassrooms.length === 0 || !!this.birthDateError;
    if (disabled && this.classroom.enabled)
      this.classroom.disable({ emitEvent: false });
    else if (!disabled && this.classroom.disabled)
      this.classroom.enable({ emitEvent: false });
  }
  openTutorModal(): void {
    this.newTutorOpen = true;
  }
  tutorCreated(t: any): void {
    this.tutors.update(rows => [...rows.filter(x => x.id !== t.id), t]);
    if (!this.tutorOne)
      this.tutorOne = t.id || '';
    else if (!this.tutorTwo)
      this.tutorTwo = t.id || '';
    this.newTutorOpen = false;
  }
  errorText(err: any, fallback: string): string {
    const detail = err?.error?.detail || err?.error?.reason || err?.error?.message || err?.error?.error;
    const readable = typeof err?.error === 'string' && err.error.length < 300 ? err.error : null;
    if (err?.status === 401)
      return 'Tu sesión venció. Cerrá sesión e ingresá de nuevo como Director o Administrativo.';
    if (err?.status === 403)
      return 'Tu perfil no tiene permiso para esta operación.';
    return detail && typeof detail === 'string' ? `${fallback}: ${detail}` : readable ? `${fallback}: ${readable}` : `${fallback} (HTTP ${err?.status || 'sin conexión'}).`;
  }
  submitStudent(): void {
    if (this.busy || this.loadingStudent || this.studentLoadFailed)
      return;
    this.studentForm.markAllAsTouched();
    if (this.studentForm.invalid) {
      this.error = 'Corregí los campos marcados antes de matricular.';
      return;
    }
    if (!this.studentsLookupReady) {
      this.error = 'No se pudo comprobar la unicidad de DNI y legajos.';
      return;
    }
    const dni = this.documentNumber.value.trim();
    const legajo = this.legajoNumber.value.trim();
    const duplicado = this.knownStudents.some(s => s.id !== this.editingId && dni && String(s.documentNumber || '').trim() === dni);
    const legajoDuplicado = this.knownStudents.some(s => s.id !== this.editingId && legajo && String(s.legajoNumber || '').trim().toLowerCase() === legajo.toLowerCase());
    if (duplicado) {
      this.documentNumber.setErrors({
        duplicate: true
      });
      this.error = 'Ya existe un alumno con ese DNI.';
      return;
    }
    if (legajoDuplicado) {
      this.legajoNumber.setErrors({
        duplicate: true
      });
      this.error = 'El número de legajo ya está registrado.';
      return;
    }
    if (!this.firstName.value?.trim() || !this.lastName.value?.trim() || (this.dniStatus.value === 'FISICO' && !this.documentNumber.value?.trim()) || !this.birthDate.value) {
      this.error = 'Completá nombre, apellido, DNI y nacimiento.';
      return;
    }
    if (this.dniStatus.value === 'FISICO' && !validNumericDni(this.documentNumber.value)) {
      this.error = 'El DNI debe tener entre 6 y 8 números, sin puntos ni letras.';
      return;
    }
    for (const phone of [
      this.studentCellphone.value,
      this.studentLandlinePhone.value,
    ]) {
      if (!validNumericPhone(phone)) {
        this.error = 'Los teléfonos deben contener solamente números (6 a 20).';
        return;
      }
    }
    this.birthDateError = validStudentBirthDate(this.birthDate.value, Number(this.academicYear.value));
    if (this.birthDateError) {
      this.error = this.birthDateError;
      return;
    }
    if (!this.tutorOne && !this.isEdit) {
      this.error = 'Seleccioná al menos un tutor responsable.';
      return;
    }
    if (this.tutorOne === this.tutorTwo) {
      this.error = 'El segundo tutor debe ser una persona diferente.';
      return;
    }
    if (this.primarySelectionRequired) {
      this.error = 'Esta matrícula es anterior al registro de tutor principal. Seleccioná expresamente quién es el tutor principal antes de guardar.';
      return;
    }
    if (!this.selectableClassrooms.some(room => room.name === this.classroom.value) || this.roomLoading) {
      this.error = this.isEdit ? 'Elegí un aula registrada para el turno seleccionado.' : 'Calculá y elegí una sala habilitada para su edad y turno.';
      return;
    }
    const tutorIds = [this.tutorOne, this.tutorTwo].filter(Boolean);
    const assignments = toStudentTutorAssignments(tutorIds, this.tutors());
    const { tutors, tutorIds: ignored, contactPhone: ignoredContact, ...payload } = this.studentForm.getRawValue();
    if (!payload.hasForeignDocument) {
      payload.foreignDocumentType = null;
      payload.foreignDocumentNumber = null;
    }
    delete payload.id;
    delete payload.tenantId;
    delete payload.institutionId;
    delete payload.createdAt;
    delete payload.updatedAt;
    this.error = '';
    this.busy = true;
    const wasEditing = !!this.editingId;
    if (tutorIds.length === 0) {
      this.busy = false;
      this.error = 'Seleccioná al menos un tutor.';
      return;
    }
    const operation = wasEditing ? this.students.updateStudent(this.editingId, payload)
      : this.students.createStudent({
        ...payload,
        tutors: tutorIds.map(id => ({
          id
        }))
      });
    operation.pipe(switchMap((student: any) => {
      const id = this.editingId || student.id;
      if (!id)
        throw new Error('El backend no devolvió el ID del alumno.');
      this.editingId = id;
      return wasEditing ? this.students.linkTutors(id, assignments) : of(void 0);
    })).subscribe({
      next: () => {
        this.busy = false;
        if (this.embedded)
          this.saved.emit(this.editingId);
        else
          this.router.navigate(['/students', this.editingId]);
      },
      error: e => {
        this.busy = false;
        this.error = this.errorText(e, 'No se pudieron guardar el alumno y sus tutores');
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
