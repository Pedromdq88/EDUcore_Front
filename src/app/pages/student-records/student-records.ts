import { pastOrCurrentYear, notBlank, ageRange, personNameValidators } from '../../validators/form.validator';
import { apiErrorMessage } from '../../utils/forms/api-error';
import { ChangeDetectorRef } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { ReactiveFormsModule, FormGroupDirective, FormGroup, FormControl, Validators } from '@angular/forms';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { ViewChild, Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudentService } from '../../services/student/student';
import { Student } from '../../models/student';
@Component({
  selector: 'app-student-records',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './student-records.html',
  styleUrl: './student-records.css'
})
export class StudentRecords implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);
  private readonly dialogs = inject(UiDialogService);
  readonly canDiscardForm = canDiscardForm;
  @ViewChild(FormGroupDirective)
  private activeForm?: FormGroupDirective;
  async closeMedicalEditor(): Promise<void> {
    if (this.busy || (this.medicalForm.dirty &&
      !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios'))))
      return;
    this.medicalModal = false;
    this.formCdr.markForCheck();
  }
  students = signal<Student[]>([]);
  records = signal<any[]>([]);
  linkedTutors = signal<any[]>([]);
  medical: any = {};
  medicalExists = signal(false);
  medicalModal = false;
  private selectedState = signal('');
  get selectedId(): string {
    return this.selectedState();
  }
  set selectedId(value: string) {
    this.selectedState.set(value);
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
  private loadingState = signal(false);
  get loading(): boolean {
    return this.loadingState();
  }
  set loading(value: boolean) {
    this.loadingState.set(value);
  }
  private readonly busyState = signal(false);
  get busy(): boolean {
    return this.busyState();
  }
  set busy(value: boolean) {
    this.busyState.set(value);
  }
  expandedRecord = '';
  private loadGeneration = 0;
  mode: 'medical' | 'pickups' | 'restrictions' = 'medical';
  editPickupId = '';
  showForm = false;
  medicalTextFields = [
    {
      key: 'obraSocial',
      label: '¿Tiene obra social?',
      max: 10,
      hint: 'Ingresá Sí o No.'
    },
    {
      key: 'detalleObraSocial',
      label: 'Nombre / descripción de obra social',
      max: 255,
      hint: 'Ingresá el nombre o un detalle de la cobertura.'
    },
    {
      key: 'nroAfiliado',
      label: 'Número de afiliado',
      max: 100,
      hint: 'Ingresá letras o números. Podés separarlos con espacios, puntos, guiones o barras.'
    },
    {
      key: 'detalleInternacion',
      label: 'Detalles de internación',
      max: 4000
    },
    {
      key: 'motivoOperacion',
      label: 'Motivo de operación',
      max: 4000
    },
    {
      key: 'anioOperacion',
      label: 'Año de operación',
      max: 4,
      hint: 'Ingresá un año de cuatro cifras que no sea futuro.'
    },
    {
      key: 'cualMedicacion',
      label: 'Medicación habitual y dosis',
      max: 4000
    }
  ];
  medicalGroups = [
    {
      label: 'Antecedentes médicos',
      fields: [
        ['asma', 'Asma'],
        ['alergiaGeneral', 'Alergias'],
        ['problemasCardiacos', 'Problemas cardíacos'],
        ['diabetes', 'Diabetes'],
        ['presionArterialElevada', 'Presión arterial elevada'],
        ['convulsiones', 'Convulsiones'],
        ['alteracionesSanguineas', 'Alteraciones sanguíneas'],
        ['quemadurasSeveras', 'Quemaduras severas'],
        ['faltaOrgano', 'Falta de órgano'],
        ['enfermedadOncohematologica', 'Enfermedad oncohematológica'],
        ['inmunodeficiencias', 'Inmunodeficiencias'],
        ['fracturasLesiones', 'Fracturas / lesiones'],
        ['otroProblemaHuesos', 'Otros problemas óseos'],
        ['traumatismoCraneo', 'Traumatismo craneal'],
        ['problemasPiel', 'Problemas de piel']
      ]
    },
    {
      label: 'Síntomas',
      fields: [
        ['desmayos', 'Desmayos'],
        ['dolorPecho', 'Dolor en el pecho'],
        ['mareos', 'Mareos'],
        ['mayorCansancio', 'Cansancio excesivo'],
        ['palpitaciones', 'Palpitaciones'],
        ['dificultadRespirar', 'Dificultad al respirar']
      ]
    },
    {
      label: 'Internaciones y operaciones',
      fields: [
        ['internacionSalaComun', 'Internación en sala común'],
        ['internacionTerapia', 'Internación en terapia'],
        ['operacion', 'Operación']
      ]
    },
    {
      label: 'Alergias e internaciones asociadas',
      fields: [
        ['alergiaMedicamentos', 'Alergia a medicamentos'],
        ['internacionMed', 'Internación por medicamentos'],
        ['alergiaVacunas', 'Alergia a vacunas'],
        ['internacionVac', 'Internación por vacunas'],
        ['alergiaAlimentos', 'Alergia a alimentos'],
        ['internacionAlim', 'Internación por alimentos'],
        ['alergiaInsectos', 'Alergia a insectos'],
        ['internacionIns', 'Internación por insectos'],
        ['alergiaEstacionales', 'Alergia estacional'],
        ['internacionEst', 'Internación por alergia estacional'],
        ['alergiaOtras', 'Otras alergias'],
        ['internacionOtr', 'Internación por otras alergias']
      ]
    },
    {
      label: 'Salud sensorial y medicación',
      fields: [
        ['disminucionAuditiva', 'Disminución auditiva'],
        ['usaAudifonos', 'Usa audífonos'],
        ['disminucionVisual', 'Disminución visual'],
        ['usaLentes', 'Usa lentes'],
        ['medicacionHabitual', 'Medicación habitual']
      ]
    },
    {
      label: 'Antecedentes familiares',
      fields: [
        ['muerteSubitaFamiliar', 'Muerte súbita'],
        ['diabetesFamiliar', 'Diabetes'],
        ['problemasCardiacosFamiliar', 'Problemas cardíacos'],
        ['tosCronicaFamiliar', 'Tos crónica'],
        ['celiaquiaFamiliar', 'Celiaquía']
      ]
    }
  ];
  medicalForm: FormGroup;
  pickupForm: FormGroup;
  restrictionForm: FormGroup;
  studentQueryControl: FormControl;
  medicalObraSocial: FormControl;
  medicalDetalleObraSocial: FormControl;
  medicalNroAfiliado: FormControl;
  medicalDetalleInternacion: FormControl;
  medicalMotivoOperacion: FormControl;
  medicalAnioOperacion: FormControl;
  medicalCualMedicacion: FormControl;
  medicalAsma: FormControl;
  medicalAlergiaGeneral: FormControl;
  medicalProblemasCardiacos: FormControl;
  medicalDiabetes: FormControl;
  medicalPresionArterialElevada: FormControl;
  medicalConvulsiones: FormControl;
  medicalAlteracionesSanguineas: FormControl;
  medicalQuemadurasSeveras: FormControl;
  medicalFaltaOrgano: FormControl;
  medicalEnfermedadOncohematologica: FormControl;
  medicalInmunodeficiencias: FormControl;
  medicalFracturasLesiones: FormControl;
  medicalOtroProblemaHuesos: FormControl;
  medicalTraumatismoCraneo: FormControl;
  medicalProblemasPiel: FormControl;
  medicalDesmayos: FormControl;
  medicalDolorPecho: FormControl;
  medicalMareos: FormControl;
  medicalMayorCansancio: FormControl;
  medicalPalpitaciones: FormControl;
  medicalDificultadRespirar: FormControl;
  medicalInternacionSalaComun: FormControl;
  medicalInternacionTerapia: FormControl;
  medicalOperacion: FormControl;
  medicalAlergiaMedicamentos: FormControl;
  medicalInternacionMed: FormControl;
  medicalAlergiaVacunas: FormControl;
  medicalInternacionVac: FormControl;
  medicalAlergiaAlimentos: FormControl;
  medicalInternacionAlim: FormControl;
  medicalAlergiaInsectos: FormControl;
  medicalInternacionIns: FormControl;
  medicalAlergiaEstacionales: FormControl;
  medicalInternacionEst: FormControl;
  medicalAlergiaOtras: FormControl;
  medicalInternacionOtr: FormControl;
  medicalDisminucionAuditiva: FormControl;
  medicalUsaAudifonos: FormControl;
  medicalDisminucionVisual: FormControl;
  medicalUsaLentes: FormControl;
  medicalMedicacionHabitual: FormControl;
  medicalMuerteSubitaFamiliar: FormControl;
  medicalDiabetesFamiliar: FormControl;
  medicalProblemasCardiacosFamiliar: FormControl;
  medicalTosCronicaFamiliar: FormControl;
  medicalCeliaquiaFamiliar: FormControl;
  medicalDIRECTOR: FormControl;
  pickupFirstName = new FormControl('', {
    nonNullable: true,
    validators: personNameValidators
  });
  pickupLastName = new FormControl('', {
    nonNullable: true,
    validators: personNameValidators
  });
  pickupDocumentNumber: FormControl;
  pickupBirthDate: FormControl;
  pickupRelationship: FormControl;
  pickupPhone: FormControl;
  restrictionFirstName: FormControl;
  restrictionLastName: FormControl;
  restrictionDocumentType: FormControl;
  restrictionDocumentNumber: FormControl;
  restrictionDescription: FormControl;
  restrictionLegajoNumber: FormControl;
  restrictionMatrixNumber: FormControl;
  restrictionFolioNumber: FormControl;
  restrictionInscriptionDate: FormControl;
  get today(): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  }
  constructor(private route: ActivatedRoute, private api: StudentService) {
    this.studentQueryControl = new FormControl('', {
      nonNullable: true
    });
    this.medicalObraSocial = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(10), Validators.pattern(/^(?:s[ií]|no)$/i)]
    });
    this.medicalDetalleObraSocial = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(255)]
    });
    this.medicalNroAfiliado = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(100), Validators.pattern(/^[a-z0-9]+(?:[ ./-][a-z0-9]+)*$/i)]
    });
    this.medicalDetalleInternacion = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(4000)]
    });
    this.medicalMotivoOperacion = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(4000)]
    });
    this.medicalAnioOperacion = new FormControl<string>('', {
      nonNullable: true,
      validators: [pastOrCurrentYear, Validators.maxLength(4)]
    });
    this.medicalCualMedicacion = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(4000)]
    });
    this.medicalAsma = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalAlergiaGeneral = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalProblemasCardiacos = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalDiabetes = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalPresionArterialElevada = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalConvulsiones = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalAlteracionesSanguineas = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalQuemadurasSeveras = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalFaltaOrgano = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalEnfermedadOncohematologica = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalInmunodeficiencias = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalFracturasLesiones = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalOtroProblemaHuesos = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalTraumatismoCraneo = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalProblemasPiel = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalDesmayos = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalDolorPecho = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalMareos = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalMayorCansancio = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalPalpitaciones = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalDificultadRespirar = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalInternacionSalaComun = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalInternacionTerapia = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalOperacion = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalAlergiaMedicamentos = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalInternacionMed = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalAlergiaVacunas = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalInternacionVac = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalAlergiaAlimentos = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalInternacionAlim = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalAlergiaInsectos = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalInternacionIns = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalAlergiaEstacionales = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalInternacionEst = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalAlergiaOtras = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalInternacionOtr = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalDisminucionAuditiva = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalUsaAudifonos = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalDisminucionVisual = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalUsaLentes = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalMedicacionHabitual = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalMuerteSubitaFamiliar = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalDiabetesFamiliar = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalProblemasCardiacosFamiliar = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalTosCronicaFamiliar = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalCeliaquiaFamiliar = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalDIRECTOR = new FormControl<boolean>(false, {
      nonNullable: true
    });
    this.medicalForm = new FormGroup({
      obraSocial: this.medicalObraSocial,
      detalleObraSocial: this.medicalDetalleObraSocial,
      nroAfiliado: this.medicalNroAfiliado,
      detalleInternacion: this.medicalDetalleInternacion,
      motivoOperacion: this.medicalMotivoOperacion,
      anioOperacion: this.medicalAnioOperacion,
      cualMedicacion: this.medicalCualMedicacion,
      asma: this.medicalAsma,
      alergiaGeneral: this.medicalAlergiaGeneral,
      problemasCardiacos: this.medicalProblemasCardiacos,
      diabetes: this.medicalDiabetes,
      presionArterialElevada: this.medicalPresionArterialElevada,
      convulsiones: this.medicalConvulsiones,
      alteracionesSanguineas: this.medicalAlteracionesSanguineas,
      quemadurasSeveras: this.medicalQuemadurasSeveras,
      faltaOrgano: this.medicalFaltaOrgano,
      enfermedadOncohematologica: this.medicalEnfermedadOncohematologica,
      inmunodeficiencias: this.medicalInmunodeficiencias,
      fracturasLesiones: this.medicalFracturasLesiones,
      otroProblemaHuesos: this.medicalOtroProblemaHuesos,
      traumatismoCraneo: this.medicalTraumatismoCraneo,
      problemasPiel: this.medicalProblemasPiel,
      desmayos: this.medicalDesmayos,
      dolorPecho: this.medicalDolorPecho,
      mareos: this.medicalMareos,
      mayorCansancio: this.medicalMayorCansancio,
      palpitaciones: this.medicalPalpitaciones,
      dificultadRespirar: this.medicalDificultadRespirar,
      internacionSalaComun: this.medicalInternacionSalaComun,
      internacionTerapia: this.medicalInternacionTerapia,
      operacion: this.medicalOperacion,
      alergiaMedicamentos: this.medicalAlergiaMedicamentos,
      internacionMed: this.medicalInternacionMed,
      alergiaVacunas: this.medicalAlergiaVacunas,
      internacionVac: this.medicalInternacionVac,
      alergiaAlimentos: this.medicalAlergiaAlimentos,
      internacionAlim: this.medicalInternacionAlim,
      alergiaInsectos: this.medicalAlergiaInsectos,
      internacionIns: this.medicalInternacionIns,
      alergiaEstacionales: this.medicalAlergiaEstacionales,
      internacionEst: this.medicalInternacionEst,
      alergiaOtras: this.medicalAlergiaOtras,
      internacionOtr: this.medicalInternacionOtr,
      disminucionAuditiva: this.medicalDisminucionAuditiva,
      usaAudifonos: this.medicalUsaAudifonos,
      disminucionVisual: this.medicalDisminucionVisual,
      usaLentes: this.medicalUsaLentes,
      medicacionHabitual: this.medicalMedicacionHabitual,
      muerteSubitaFamiliar: this.medicalMuerteSubitaFamiliar,
      diabetesFamiliar: this.medicalDiabetesFamiliar,
      problemasCardiacosFamiliar: this.medicalProblemasCardiacosFamiliar,
      tosCronicaFamiliar: this.medicalTosCronicaFamiliar,
      celiaquiaFamiliar: this.medicalCeliaquiaFamiliar,
      DIRECTOR: this.medicalDIRECTOR,
    });
    this.pickupDocumentNumber = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{6,8}$/)]
    });
    this.pickupBirthDate = new FormControl<string>('', {
      nonNullable: true,
      validators: [ageRange(18), Validators.required]
    });
    this.pickupRelationship = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)]
    });
    this.pickupPhone = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{6,20}$/)]
    });
    this.pickupForm = new FormGroup({
      firstName: this.pickupFirstName,
      lastName: this.pickupLastName,
      documentNumber: this.pickupDocumentNumber,
      birthDate: this.pickupBirthDate,
      relationship: this.pickupRelationship,
      phone: this.pickupPhone,
    });
    this.restrictionFirstName = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/)
      ]
    });
    this.restrictionLastName = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/)
      ]
    });
    this.restrictionDocumentType = new FormControl<string>('DNI', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20), Validators.pattern(/^[\p{L}][\p{L}\p{M}0-9 .\/-]*$/u)]
    });
    this.restrictionDocumentNumber = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{6,8}$/)]
    });
    this.restrictionDescription = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        notBlank,
        Validators.required,
        control => control.value?.trim() && control.value.trim().length < 5 ? { minlength: true } : null,
        Validators.maxLength(4000)
      ]
    });
    const judicialReferenceValidators = [
      Validators.maxLength(50),
      Validators.pattern(/^[\p{L}0-9]+(?:[ .\/_-][\p{L}0-9]+)*$/u)
    ];
    this.restrictionLegajoNumber = new FormControl<string>('', {
      nonNullable: true,
      validators: judicialReferenceValidators
    });
    this.restrictionMatrixNumber = new FormControl<string>('', {
      nonNullable: true,
      validators: judicialReferenceValidators
    });
    this.restrictionFolioNumber = new FormControl<string>('', {
      nonNullable: true,
      validators: judicialReferenceValidators
    });
    this.restrictionInscriptionDate = new FormControl<string>('', {
      nonNullable: true,
      validators: [control => {
        const value = control.value;
        if (!value) return null;
        const date = new Date(value + 'T00:00:00Z');
        return /^[1-9]\d{3}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime())
          && date.toISOString().slice(0, 10) === value && value <= this.today
          ? null : { inscriptionDate: true };
      }]
    });
    this.restrictionForm = new FormGroup({
      firstName: this.restrictionFirstName,
      lastName: this.restrictionLastName,
      documentType: this.restrictionDocumentType,
      documentNumber: this.restrictionDocumentNumber,
      description: this.restrictionDescription,
      legajoNumber: this.restrictionLegajoNumber,
      matrixNumber: this.restrictionMatrixNumber,
      folioNumber: this.restrictionFolioNumber,
      inscriptionDate: this.restrictionInscriptionDate,
    });
  }
  get filteredStudents(): Student[] {
    const q = this.studentQueryControl.value.trim().toLowerCase();
    return this.students().filter(s => !q || [s.firstName, s.lastName, s.documentNumber, s.classroom].join(' ').toLowerCase().includes(q));
  }
  get selectedStudent(): Student | undefined {
    return this.students().find(s => s.id === this.selectedId);
  }
  get pickupAge(): number | null {
    return /^\d{4}-\d{2}-\d{2}$/.test(this.pickupBirthDate.value) ? this.age(this.pickupBirthDate.value) : null;
  }
  selectStudent(id: string): void {
    if (this.selectedId === id)
      return;
    this.selectedId = id;
    this.load();
  }
  get title(): string {
    return this.mode === 'medical' ? 'Ficha Médica Escolar' : this.mode === 'pickups' ? 'Control de Retiros' : 'Restricciones Judiciales';
  }
  get canEdit(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '') || (this.mode === 'pickups' && sessionStorage.getItem('current_user_role') === 'PRECEPTOR');
  }
  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] || 'medical') as any;
    this.api.getStudents().subscribe({
      next: s => {
        this.students.set(s);
        const query = this.route.snapshot.queryParamMap.get('studentId');
        const first = (query && s.some(x => x.id === query) ? query : s[0]?.id) || '';
        if (first) {
          this.selectedId = first;
          this.load();
        }
      },
      error: () => this.error = 'No se pudieron cargar los estudiantes.'
    });
  }
  load(): void {
    this.error = '';
    this.message = '';
    this.records.set([]);
    this.linkedTutors.set([]);
    this.medical = {};
    this.medicalExists.set(false);
    this.medicalModal = false;
    this.showForm = false;
    const reqId = ++this.loadGeneration;
    if (!this.selectedId)
      return;
    this.loading = true;
    const id = this.selectedId;
    if (this.mode === 'pickups') {
      this.api.getStudentById(id).subscribe({
        next: s => {
          if (reqId === this.loadGeneration)
            this.linkedTutors.set(s.tutors || []);
        },
        error: () => {
          if (reqId === this.loadGeneration)
            this.error = 'No se pudieron cargar los responsables vinculados.';
        }
      });
    }
    const req = this.mode === 'medical' ? this.api.getMedicalRecord(id) : this.mode === 'pickups' ? this.api.getAuthorizedPickups(id) : this.api.getJudicialRestrictions(id);
    req.subscribe({
      next: result => {
        if (reqId !== this.loadGeneration)
          return;
        this.loading = false;
        if (this.mode === 'medical') {
          this.medical = result || {};
          this.medicalExists.set(!!result?.id);
        }
        else
          this.records.set(result || []);
      },
      error: () => {
        if (reqId !== this.loadGeneration)
          return;
        this.loading = false;
        this.error = 'No se pudieron consultar los registros del alumno.';
      }
    });
  }
  openMedical(): void {
    if (!this.canEdit)
      return;
    this.medicalForm.reset();
    this.medicalForm.patchValue(this.medical);
    this.medicalModal = true;
    this.error = '';
  }
  saveMedical(): void {
    this.medicalForm.markAllAsTouched();
    if (this.medicalForm.invalid) {
      this.error = 'Revisá los datos de la ficha médica.';
      return;
    }
    if (this.busy)
      return;
    if (!this.selectedId || !this.canEdit)
      return;
    this.busy = true;
    this.error = '';
    this.api.saveMedicalRecord(this.selectedId, this.medicalForm.getRawValue()).subscribe({
      next: () => {
        this.busy = false;
        this.medicalModal = false;
        this.load();
        this.message = 'Ficha médica guardada.';
      },
      error: e => {
        this.busy = false;
        this.error = apiErrorMessage(e, 'No se pudo guardar la ficha médica.');
      }
    });
  }
  authorizeTutor(t: any): void {
    this.openPickup({
      firstName: t.firstName || '',
      lastName: t.lastName || '',
      documentNumber: t.documentNumber || '',
      relationship: t.relationship || 'TUTOR_LEGAL',
      phone: t.phone || '',
      birthDate: ''
    });
    this.editPickupId = '';
  }
  openPickup(item?: any): void {
    this.error = '';
    this.showForm = true;
    this.editPickupId = item?.id || '';
    this.pickupForm.reset();
    if (item) {
      const parts = String(item.fullName || '').trim().split(/\s+/);
      this.pickupForm.patchValue({
        ...item,
        firstName: item.firstName ?? parts.shift() ?? '',
        lastName: item.lastName ?? parts.join(' ')
      });
    }
  }
  savePickup(): void {
    this.pickupForm.markAllAsTouched();
    if (this.busy || !this.canEdit || !this.selectedId)
      return;
    if (this.pickupForm.invalid) {
      this.error = 'Revisá nombre, DNI, fecha, vínculo y teléfono.';
      return;
    }
    const { firstName, lastName, ...fields } = this.pickupForm.getRawValue();
    const data = {
      ...fields,
      fullName: firstName.trim() + ' ' + lastName.trim()
    };
    const age = this.age(data.birthDate);
    if (!Number.isFinite(age) || age < 18 || age > 80) {
      this.pickupBirthDate.setErrors({
        age: true
      });
      this.error = 'El autorizado debe tener entre 18 y 80 años.';
      return;
    }
    if (this.records().some(p => p.id !== this.editPickupId && p.documentNumber === data.documentNumber)) {
      this.pickupDocumentNumber.setErrors({
        duplicate: true
      });
      this.error = 'Esta persona ya está autorizada para el alumno.';
      return;
    }
    this.busy = true;
    this.error = '';
    this.api.getJudicialRestrictions(this.selectedId).subscribe({
      next: restrictions => {
        if ((restrictions || []).some(r => r.documentNumber === data.documentNumber)) {
          this.busy = false;
          this.error = 'La persona tiene una restricción judicial vigente para este alumno.';
          return;
        }
        const request = this.editPickupId
          ? this.api.updateAuthorizedPickup(this.selectedId, this.editPickupId, {
            ...data,
            age
          })
          : this.api.createAuthorizedPickup(this.selectedId, {
            ...data,
            age
          });
        request.subscribe({
          next: () => {
            this.busy = false;
            this.load();
          },
          error: e => {
            this.busy = false;
            this.error = 'No se pudo guardar el autorizado (HTTP ' + (e.status || 'sin conexión') + ').';
          }
        });
      },
      error: () => {
        this.busy = false;
        this.error = 'No se pudieron verificar las restricciones judiciales. No se guardó la autorización.';
      }
    });
  }
  age(date: string): number {
    const born = new Date(date + 'T12:00:00');
    const today = new Date();
    return today.getFullYear() - born.getFullYear() - (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate()) ? 1 : 0);
  }
  async removePickup(id: string): Promise<void> {
    if (!this.selectedId || !(await this.dialogs.confirm('¿Eliminar esta persona autorizada?')))
      return;
    this.api.deleteAuthorizedPickup(this.selectedId, id).subscribe({
      next: () => this.load(),
      error: () => this.error = 'No se pudo eliminar el autorizado.'
    });
  }
  saveRestriction(): void {
    if (this.busy || !this.canEdit || !this.selectedId)
      return;
    this.restrictionForm.markAllAsTouched();
    if (this.restrictionForm.invalid) {
      this.error = 'Revisá los campos marcados en la restricción judicial.';
      return;
    }
    const values = this.restrictionForm.getRawValue();
    const data = {
      ...values,
      description: values.description.trim(),
      documentType: values.documentType.trim(),
      legajoNumber: values.legajoNumber || null,
      matrixNumber: values.matrixNumber || null,
      folioNumber: values.folioNumber || null,
      inscriptionDate: values.inscriptionDate || null
    };
    if (this.records().some(r => r.documentNumber === data.documentNumber)) {
      this.restrictionDocumentNumber.setErrors({
        duplicate: true
      });
      this.error = 'Ya existe una restricción para este DNI.';
      return;
    }
    this.busy = true;
    this.error = '';
    const studentId = this.selectedId;
    this.api.getAuthorizedPickups(studentId).subscribe({
      next: pickups => {
        if ((pickups || []).some(p => p.documentNumber === data.documentNumber)) {
          this.busy = false;
          this.error = 'Este DNI figura como autorizado para retirar al alumno. Resolvé el conflicto antes de registrar la restricción.';
          return;
        }
        this.api.createJudicialRestriction(studentId, data).subscribe({
          next: () => {
            this.busy = false;
            if (this.selectedId === studentId) {
              this.restrictionForm.reset();
              this.load();
              this.message = 'Restricción judicial guardada.';
            }
          },
          error: e => {
            this.busy = false;
            this.error = apiErrorMessage(e, 'No se pudo guardar la restricción.');
          }
        });
      },
      error: e => {
        this.busy = false;
        this.error = apiErrorMessage(e, 'No se pudieron verificar las autorizaciones de retiro.');
      }
    });
  }
  async removeRestriction(id: string): Promise<void> {
    if (!this.selectedId || !(await this.dialogs.confirm('¿Eliminar esta restricción judicial?')))
      return;
    this.api.deleteJudicialRestriction(this.selectedId, id).subscribe({
      next: () => this.load(),
      error: () => this.error = 'No se pudo eliminar la restricción.'
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
