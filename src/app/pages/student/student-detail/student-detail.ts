import { inject, ChangeDetectionStrategy } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { AnnouncementService } from '../../../services/announcements/announcements';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentService, LinkedSibling } from '../../../services/student/student';
import { Student } from '../../../models/student';
import { PickupMiniProfile } from '../../../components/pickup-mini-profile/pickup-mini-profile';
import { StudentForm } from '../student-form/student-form';
import { PrivateStudentAnnouncement } from '../../../components/private-student-announcement/private-student-announcement';
import { studentAgeAtCutoff } from '../../../utils/classroom-date';
<<<<<<< HEAD
=======

>>>>>>> cafb98c40096dc668666b1ffc7f82798116ae73d
interface StudentProfile extends Student {
  hasCpi?: boolean;
  hasForeignDocument?: boolean;
  foreignDocumentType?: string;
  foreignDocumentNumber?: string;
  birthDistrict?: string;
  addressDistrict?: string;
  otherAddressDetails?: string;
  speaksOtherLanguageAtHome?: boolean;
  indigenousLanguage?: boolean;
  otherLanguage?: boolean;
  bloodType?: string;
  healthInsurance?: string;
  allergies?: string;
  birthPlace?: string;
  address?: string;
}
<<<<<<< HEAD
=======

>>>>>>> cafb98c40096dc668666b1ffc7f82798116ae73d
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-student-detail',
  standalone: true,
<<<<<<< HEAD
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    StudentForm,
    PrivateStudentAnnouncement,
    PickupMiniProfile
  ],
=======
  imports: [CommonModule, FormsModule, RouterModule, StudentForm, PrivateStudentAnnouncement, PickupMiniProfile],
>>>>>>> cafb98c40096dc668666b1ffc7f82798116ae73d
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.css'
})
export class StudentDetail implements OnInit {
<<<<<<< HEAD
  private readonly dialogs = inject(UiDialogService);
  confirmedSiblings = signal<LinkedSibling[]>([]);
  siblingCandidates = signal<LinkedSibling[]>([]);
  siblingError = '';
  siblingBusy = false;
  student = signal<StudentProfile | null>(null);
  editOpen = false;
  privateNoticeOpen = false;
  privateNoticeToEdit: any | null = null;
  privateNoticeSuccess = '';
  privateNotices = signal<any[]>([]);
  observationControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(8), Validators.maxLength(4000)]
  });
  observationForm = new FormGroup({
    observation: this.observationControl
  });
  observationBusy = false;
  observationMessage = '';
  observationError = '';
  get isTeacher(): boolean {
    return sessionStorage.getItem('current_user_role') === 'TEACHER';
  }
  sendObservation(): void {
    const student = this.student();
    this.observationForm.markAllAsTouched();
    if (this.observationForm.invalid) {
      this.observationError = 'Revisá el texto de la observación.';
      return;
    }
    const text = this.observationControl.value.trim();
    if (!this.isTeacher || !student?.id || text.length < 8) {
      this.observationError = 'Escribí una observación de al menos 8 caracteres.';
      return;
    }
    this.observationBusy = true;
    this.observationError = '';
    this.observationMessage = '';
    this.announcements.createTeacherObservation(student.id, text)
      .subscribe({
        next: () => {
          this.observationBusy = false;
          this.observationForm.reset();
          this.observationMessage = 'Observación enviada a los tutores vinculados.';
        },
        error: e => {
          this.observationBusy = false;
          this.observationError = e.status === 403 ? 'No tenés autorización para este alumno.' : 'No se pudo enviar la observación.';
        }
      });
=======
  private readonly dialogs=inject(UiDialogService);

  confirmedSiblings = signal<LinkedSibling[]>([]);
  siblingCandidates = signal<LinkedSibling[]>([]);
  siblingError=''; siblingBusy=false;
  student = signal<StudentProfile | null>(null); editOpen=false; privateNoticeOpen=false; privateNoticeToEdit:any|null=null; privateNoticeSuccess='';
  privateNotices=signal<any[]>([]);
  observation='';observationBusy=false;observationMessage='';observationError='';
  get isTeacher():boolean{return sessionStorage.getItem('current_user_role')==='TEACHER';}
  sendObservation():void{
    const student=this.student(); const text=this.observation.trim();
    if(!this.isTeacher||!student?.id||text.length<8){this.observationError='Escribí una observación de al menos 8 caracteres.';return;}
    this.observationBusy=true;this.observationError='';this.observationMessage='';
    this.announcements.createTeacherObservation(student.id, text)
    .subscribe({next:()=>{this.observationBusy=false;this.observation='';this.observationMessage='Observación enviada a los tutores vinculados.';},
      error:e=>{this.observationBusy=false;this.observationError=e.status===403?'No tenés autorización para este alumno.':'No se pudo enviar la observación.';}});
>>>>>>> cafb98c40096dc668666b1ffc7f82798116ae73d
  }
  medicalRecord = signal<any>(null);
  pickups = signal<any[]>([]);
  restrictions = signal<any[]>([]);
<<<<<<< HEAD
  get canEditStudent(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  get canManagePrivateNotices(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE', 'PRECEPTOR'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  get canViewMedical(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE', 'PRECEPTOR'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  get canViewPickups(): boolean {
    return this.canViewMedical;
  }
  get canViewRestrictions(): boolean {
    return this.canViewMedical;
  }
  get canViewFamily(): boolean {
    return !['TEACHER'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  readonly ageAtCutoff = studentAgeAtCutoff;
=======
  get canEditStudent():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
  get canManagePrivateNotices():boolean{return ['DIRECTOR','ADMINISTRATIVE','PRECEPTOR'].includes(sessionStorage.getItem('current_user_role')||'');}
  get canViewMedical():boolean{return ['DIRECTOR','ADMINISTRATIVE','PRECEPTOR'].includes(sessionStorage.getItem('current_user_role')||'');}
  get canViewPickups():boolean{return this.canViewMedical;}
  get canViewRestrictions():boolean{return this.canViewMedical;}
  get canViewFamily():boolean{return !['TEACHER'].includes(sessionStorage.getItem('current_user_role')||'');}

  readonly ageAtCutoff = studentAgeAtCutoff;

>>>>>>> cafb98c40096dc668666b1ffc7f82798116ae73d
  get primaryTutor(): any | null {
    const current = this.student();
    const tutors = current?.tutors || [];
    return tutors.find(t => t.id === current?.primaryTutorId)
      ?? (tutors.length === 1 ? tutors[0] : null);
  }
<<<<<<< HEAD
  displayValue(value: unknown): string {
    if (value === null || value === undefined || value === '')
      return 'No informado';
    if (typeof value === 'boolean')
      return value ? 'Sí' : 'No';
    return String(value);
  }
  displayShift(value: string | undefined): string {
    if (value === 'MANANA')
      return 'Mañana';
    if (value === 'TARDE')
      return 'Tarde';
    if (value === 'AMBOS')
      return 'Ambos turnos';
    return this.displayValue(value);
  }
  displayStatus(value: string | undefined): string {
    if (value === 'ACTIVE')
      return 'Activo';
    if (value === 'INACTIVE')
      return 'Inactivo';
    return this.displayValue(value);
  }
  constructor(private route: ActivatedRoute, private studentService: StudentService, private router: Router, private announcements: AnnouncementService) { }
=======

  displayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'No informado';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return String(value);
  }

  displayShift(value: string | undefined): string {
    if (value === 'MANANA') return 'Mañana';
    if (value === 'TARDE') return 'Tarde';
    if (value === 'AMBOS') return 'Ambos turnos';
    return this.displayValue(value);
  }

  displayStatus(value: string | undefined): string {
    if (value === 'ACTIVE') return 'Activo';
    if (value === 'INACTIVE') return 'Inactivo';
    return this.displayValue(value);
  }

  constructor(
    private route: ActivatedRoute,
    private studentService: StudentService,private router:Router,private announcements:AnnouncementService
  ) {}

>>>>>>> cafb98c40096dc668666b1ffc7f82798116ae73d
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadStudentData(id);
    }
  }
  loadStudentData(id: string) {
    this.studentService.getStudentById(id).subscribe(data => this.student.set(data));
<<<<<<< HEAD
    if (this.canManagePrivateNotices)
      this.loadPrivateNotices(id);
    if (this.canViewFamily)
      this.loadSiblings(id);
    if (this.canViewMedical)
      this.studentService.getMedicalRecord(id).subscribe(data => this.medicalRecord.set(data));
    if (this.canViewPickups)
      this.studentService.getAuthorizedPickups(id).subscribe(data => this.pickups.set(data));
    if (this.canViewRestrictions)
      this.studentService.getJudicialRestrictions(id).subscribe(data => this.restrictions.set(data));
  }
=======
    if(this.canManagePrivateNotices)this.loadPrivateNotices(id);
    if(this.canViewFamily)this.loadSiblings(id);
    if(this.canViewMedical)this.studentService.getMedicalRecord(id).subscribe(data => this.medicalRecord.set(data));
    if(this.canViewPickups)this.studentService.getAuthorizedPickups(id).subscribe(data => this.pickups.set(data));
    if(this.canViewRestrictions)this.studentService.getJudicialRestrictions(id).subscribe(data => this.restrictions.set(data));
  }

>>>>>>> cafb98c40096dc668666b1ffc7f82798116ae73d
  private loadSiblings(studentId: string): void {
    this.studentService.getSiblingOptions(studentId).subscribe({
      next: options => {
        this.confirmedSiblings.set(options.confirmed);
        this.siblingCandidates.set(options.candidates);
<<<<<<< HEAD
        this.siblingError = '';
      },
      error: () => {
        this.siblingError = 'No se pudieron consultar los vínculos de hermanos.';
      }
    });
  }
  async confirmSibling(candidate: LinkedSibling): Promise<void> {
    const student = this.student();
    if (!this.canEditStudent || !student?.id || this.siblingBusy)
      return;
    const accepted = await this.dialogs.confirm(`¿Confirmás que ${candidate.firstName} ${candidate.lastName} es hermano/a de ${student.firstName} ${student.lastName}?`, 'Confirmar vínculo familiar');
    if (!accepted)
      return;
    this.siblingBusy = true;
    this.studentService.confirmSibling(student.id, candidate.id).subscribe({
      next: () => {
        this.siblingBusy = false;
        this.loadSiblings(student.id!);
      },
      error: () => {
        this.siblingBusy = false;
        this.siblingError = 'No se pudo guardar el vínculo de hermanos.';
      }
    });
  }
  async removeSibling(sibling: LinkedSibling): Promise<void> {
    const student = this.student();
    if (!this.canEditStudent || !student?.id || this.siblingBusy)
      return;
    if (!(await this.dialogs.confirm(`¿Quitar el vínculo de hermanos con ${sibling.firstName} ${sibling.lastName}?`, 'Quitar vínculo')))
      return;
    this.siblingBusy = true;
    this.studentService.removeSibling(student.id, sibling.id).subscribe({
      next: () => {
        this.siblingBusy = false;
        this.loadSiblings(student.id!);
      },
      error: () => {
        this.siblingBusy = false;
        this.siblingError = 'No se pudo quitar el vínculo de hermanos.';
      }
    });
  }
  private loadPrivateNotices(studentId: string): void {
=======
        this.siblingError='';
      },
      error: () => {this.siblingError='No se pudieron consultar los vínculos de hermanos.';}
    });
  }

  async confirmSibling(candidate: LinkedSibling): Promise<void> {
    const student=this.student();
    if (!this.canEditStudent || !student?.id || this.siblingBusy) return;
    const accepted=await this.dialogs.confirm(
      `¿Confirmás que ${candidate.firstName} ${candidate.lastName} es hermano/a de ${student.firstName} ${student.lastName}?`,
      'Confirmar vínculo familiar'
    );
    if (!accepted) return;
    this.siblingBusy=true;
    this.studentService.confirmSibling(student.id, candidate.id).subscribe({
      next:()=>{this.siblingBusy=false;this.loadSiblings(student.id!);},
      error:()=>{this.siblingBusy=false;this.siblingError='No se pudo guardar el vínculo de hermanos.';}
    });
  }

  async removeSibling(sibling: LinkedSibling): Promise<void> {
    const student=this.student();
    if (!this.canEditStudent || !student?.id || this.siblingBusy) return;
    if (!(await this.dialogs.confirm(`¿Quitar el vínculo de hermanos con ${sibling.firstName} ${sibling.lastName}?`, 'Quitar vínculo'))) return;
    this.siblingBusy=true;
    this.studentService.removeSibling(student.id, sibling.id).subscribe({
      next:()=>{this.siblingBusy=false;this.loadSiblings(student.id!);},
      error:()=>{this.siblingBusy=false;this.siblingError='No se pudo quitar el vínculo de hermanos.';}
    });
  }

  private loadPrivateNotices(studentId:string):void{
>>>>>>> cafb98c40096dc668666b1ffc7f82798116ae73d
    this.announcements.getPrivateStudentAnnouncements(studentId).subscribe({
      next: rows => this.privateNotices.set(rows),
      error: () => this.privateNotices.set([])
    });
  }
  openPrivateNotice(notice: any | null = null): void {
    if (!this.canManagePrivateNotices)
      return;
    this.privateNoticeToEdit = notice;
    this.privateNoticeSuccess = '';
    this.privateNoticeOpen = true;
  }
  closePrivateNotice(): void {
    this.privateNoticeOpen = false;
    this.privateNoticeToEdit = null;
  }
  async removePrivateNotice(id: string): Promise<void> {
    const child = this.student();
    if (!this.canManagePrivateNotices || !child?.id || !(await this.dialogs.confirm('¿Eliminar este aviso privado?')))
      return;
    this.announcements.deletePrivateStudentAnnouncement(child.id, id).subscribe({
      next: () => this.loadPrivateNotices(child.id!),
      error: () => this.privateNoticeSuccess = 'No se pudo eliminar el aviso privado.'
    });
  }
  afterPrivateNotice(): void {
    const updated = !!this.privateNoticeToEdit;
    this.closePrivateNotice();
    this.privateNoticeSuccess = updated
      ? 'Aviso privado actualizado.'
      : 'Aviso privado guardado. Se notificará al tutor principal si tiene correo válido.';
    const id = this.student()?.id;
    if (id)
      this.loadPrivateNotices(id);
  }
  afterEdit(id: string): void {
    this.editOpen = false;
    this.loadStudentData(id);
  }
  async bajaStudent(): Promise<void> {
    const s = this.student();
    if (s?.id && (await this.dialogs.confirm("¿Dar de baja a este alumno?"))) {
      this.studentService.bajaStudent(s.id).subscribe(() => {
        this.router.navigate(['/students']);
      });
    }
  }
}
