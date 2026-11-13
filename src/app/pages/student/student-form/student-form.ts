import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { NgForm } from '@angular/forms';
import { validNumericDni, validNumericPhone } from '../../../validators/identity.validator';
import { canDiscardForm } from '../../../utils/forms/form-ux';
import { ValidateSubmitDirective } from '../../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../../utils/forms/field-validation.directive';
import { toStudentTutorAssignments } from '../../../mappers/tutor.mapper';
import { ViewChild, Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { validStudentBirthDate, studentAgeAtCutoff } from '../../../utils/classroom-date';
import { TutorModal } from '../../../components/tutor-modal/tutor-modal';
import { StudentService } from '../../../services/student/student';
import { TutorService } from '../../../services/tutor/tutor';
import { Student } from '../../../models/student';
import { TenantService } from '../../../services/tenant/tenant';
import { ShiftService } from '../../../services/shift/shift';

interface RoomOption { id:string; name:string; minimumAge:number; shift:string; }
interface RoomEligibility { ageAtCutoff:number|null; cutoffDate:string; options:RoomOption[]; message:string; }

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-student-form',standalone:true,imports: [FieldValidationDirective, ValidateSubmitDirective, CommonModule,FormsModule,RouterLink,TutorModal],templateUrl:'./student-form.html',styleUrl:'./student-form.css'})
export class StudentForm implements OnInit {
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
  @Input() embedded = false;
  @Input() studentId = '';
  @Output() saved = new EventEmitter<string>();
  @Output() dismissed = new EventEmitter<void>();
  tutors=signal<any[]>([]);
  existingStudents=signal<Student[]>([]);
  eligibility=signal<RoomEligibility | null>(null);
  editingId=''; private readonly busyState = signal(false);
  get busy(): boolean {return this.busyState();}
  set busy(value: boolean) {this.busyState.set(value);}
   private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
   private readonly messageState = signal('');
  get message(): string {return this.messageState();}
  set message(value: string) {this.messageState.set(value);}
   loadingStudent=false; studentLoadFailed=false;
  roomLoading=false; private roomRequest=0; birthDateError='';
  allClassrooms: RoomOption[]=[];
  newTutorOpen=false;
  tutorOne='';tutorTwo=''; tutorSearch=''; activeYearLoading=true;
  /** Registros antiguos pueden no tener todavía un is_primary marcado. */
  primarySelectionRequired=false;
  tutorDropdown:1|2|0=0;
  get selectedTutorOne():any{return this.tutors().find(t=>t.id===this.tutorOne);}
  get selectedTutorTwo():any{return this.tutors().find(t=>t.id===this.tutorTwo);}
  get possibleSiblings(): Student[] {
    const selected = [this.tutorOne, this.tutorTwo].filter(Boolean);
    if (!selected.length) return [];
    return this.existingStudents().filter(student =>
      student.id !== this.editingId &&
      (student.tutors || []).some(tutor => selected.includes(tutor.id))
    );
  }
  toggleTutorPicker(which:1|2):void{this.tutorSearch='';this.tutorDropdown=this.tutorDropdown===which?0:which;}
  chooseTutor(which:1|2, id:string):void{
    if(which===1){if(this.tutorTwo===id)this.tutorTwo='';this.tutorOne=id;this.primarySelectionRequired=false;}
    else if(!this.tutorOne){this.tutorOne=id;this.primarySelectionRequired=false;}
    else {if(this.tutorOne===id)this.tutorOne='';this.tutorTwo=id;}
    this.tutorDropdown=0;this.tutorSearch='';
  }
  clearTutor(which:1|2):void{
    if(which===1){
      // El secundario pasa inmediatamente a principal en la interfaz.
      this.tutorOne=this.tutorTwo;this.tutorTwo='';
      if(this.tutorOne)this.primarySelectionRequired=false;
    }else this.tutorTwo='';
    this.tutorDropdown=0;
  }
  get matchingTutors():any[]{return this.selectableTutors.filter(t=>t.id!==(this.tutorDropdown===1?this.tutorTwo:this.tutorOne));}
  get selectableTutors():any[]{const q=this.tutorSearch.trim().toLocaleLowerCase('es');
    const seen=new Set<string>(); return this.tutors().filter(t=>{
      const key=(t.documentNumber||'').replace(/\D/g,'')||t.id;
      if(seen.has(key))return false;seen.add(key);
      return !q||[t.firstName,t.lastName,t.documentNumber].join(' ').toLocaleLowerCase('es').includes(q);
    });}
  get tutorTwoOptions():any[]{return this.selectableTutors.filter(t=>t.id!==this.tutorOne||t.id===this.tutorTwo);}
  get tutorOneOptions():any[]{return this.selectableTutors.filter(t=>t.id!==this.tutorTwo||t.id===this.tutorOne);}
  chooseExistingTutor(t:any):void{if(!this.tutorOne)this.tutorOne=t.id;else if(!this.tutorTwo&&this.tutorOne!==t.id)this.tutorTwo=t.id;this.newTutorOpen=false;this.tutorDropdown=0;}
  form:any={firstName:'',lastName:'',documentNumber:'',legajoNumber:'',birthDate:'',classroom:'',studentShift:'MANANA',academicYear:new Date().getFullYear(),status:'ACTIVE',cuil:'',dniStatus:'FISICO',hasCpi:false,hasForeignDocument:false,foreignDocumentType:'',foreignDocumentNumber:'',genderIdentity:'NO_RESPONDE',birthCountry:'ARGENTINA',nationality:'Argentina',birthProvince:'Buenos Aires',birthDistrict:'',birthLocality:'',street:'',streetNumber:'',floor:'',tower:'',apartment:'',betweenStreets:'',addressDistrict:'',addressLocality:'',otherAddressDetails:'',studentLandlinePhone:'',studentCellphone:'',hasSiblings:false,siblingCount:0,siblingsInThisSchool:0,receivesAuh:false,belongsToNativePeople:false,speaksOtherLanguageAtHome:false,indigenousLanguage:false,otherLanguage:false,transportationMethods:'A_PIE',gender:'',bloodType:'',healthInsurance:'',allergies:'',birthPlace:'',address:''};
  constructor(private students:StudentService, private tutorApi:TutorService, private tenantApi:TenantService, private shifts:ShiftService, private route:ActivatedRoute, private router:Router){}
  get isEdit():boolean{return !!this.editingId;}
  ngOnInit():void {
    this.editingId=this.studentId||this.route.snapshot.paramMap.get('id')||'';
    this.tenantApi.getProfile().subscribe({next:p=>{
      const year=Number((p.profile||p)?.academicYear);
      if(year>=2000&&year<=2100 && !this.isEdit){this.form.academicYear=year;this.refreshClassrooms();}
      this.activeYearLoading=false;
      this.formCdr.markForCheck();
    },error:()=>{this.activeYearLoading=false;this.error='No se pudo recuperar el ciclo lectivo activo de la escuela.';this.formCdr.markForCheck();}});
    this.tutorApi.getTutors().subscribe({next:rows=>{this.tutors.set(rows);this.formCdr.markForCheck();},error:e=>{this.error=this.errorText(e,'No se pudieron cargar los tutores');this.formCdr.markForCheck();}});
    this.students.getStudents().subscribe({next:rows=>{this.existingStudents.set(rows);this.formCdr.markForCheck();},error:()=>{}});
    this.shifts.getClassroomsConfig().subscribe({
      next:rooms=>{this.allClassrooms=rooms;this.formCdr.markForCheck();},
      error:()=>{if(this.isEdit)this.error='No se pudieron cargar las aulas registradas.';this.formCdr.markForCheck();}
    });
    if(this.isEdit){
      this.loadingStudent=true;
      this.students.getStudentById(this.editingId).subscribe({
        next:s=>{
          this.form={...this.form,...s,birthDate:(s.birthDate||'').substring(0,10),studentShift:s.studentShift||this.form.studentShift,academicYear:s.academicYear||this.form.academicYear};
          this.tutorOne=s.tutors?.[0]?.id||'';
          this.tutorTwo=s.tutors?.[1]?.id||'';
          this.primarySelectionRequired=!!(this.tutorTwo && !s.primaryTutorId);
          this.loadingStudent=false;
          this.refreshClassrooms();
          this.formCdr.markForCheck();
        }, error:e=>{
          this.loadingStudent=false; this.studentLoadFailed=true;
          this.error=this.errorText(e,'No se pudo cargar la ficha existente; no se permite editar en blanco');
          this.formCdr.markForCheck();
        }
      });
    }
  }
  get previewAge():number|null{return studentAgeAtCutoff(this.form.birthDate, Number(this.form.academicYear));}
  get rooms():RoomOption[]{return this.eligibility()?.options||[];}
  get selectableClassrooms():RoomOption[]{
    if(!this.isEdit)return this.rooms;
    return this.allClassrooms.filter(room=>!this.form.studentShift || room.shift===this.form.studentShift || room.shift==='AMBOS');
  }
  isRecommendedClassroom(name:string):boolean{return this.rooms.some(room=>room.name===name);}
  get calculatedAge():number|null{return this.eligibility()?.ageAtCutoff??null;}
  get canSubmit():boolean{return !this.activeYearLoading && !this.busy && !this.loadingStudent && !this.studentLoadFailed && !this.roomLoading && this.selectableClassrooms.some(r=>r.name===this.form.classroom);}
  refreshClassrooms():void {
    const birthDate=this.form.birthDate;
    const year=Number(this.form.academicYear);
    const shift=this.form.studentShift;
    const request=++this.roomRequest;
    this.eligibility.set(null);
    this.birthDateError='';
    if(!birthDate || !year || !shift){this.roomLoading=false;return;}
    this.birthDateError=validStudentBirthDate(birthDate, year);
    if(this.birthDateError){this.roomLoading=false;return;}
    this.roomLoading=true;
    this.students.getClassroomOptions(birthDate,year,shift).subscribe({
      next:info=>{
        if(request!==this.roomRequest)return;
        this.eligibility.set(info);
        // En edición preserva la asignación ya guardada si sigue habilitada.
        if(!this.isEdit && !info.options.some(o=>o.name===this.form.classroom)) this.form.classroom=info.options[0]?.name||'';
        this.roomLoading=false;
        this.formCdr.markForCheck();
      },error:e=>{
        if(request!==this.roomRequest)return;
        this.eligibility.set({ageAtCutoff:null,cutoffDate:'',options:[],message:this.errorText(e,'No se pudo calcular la sala')});
        if(!this.isEdit)this.form.classroom='';this.roomLoading=false;this.formCdr.markForCheck();
      }
    });
  }
  openTutorModal():void { this.newTutorOpen=true; }
  tutorCreated(t:any):void {
    this.tutors.update(rows=>[...rows.filter(x=>x.id!==t.id),t]);
    if(!this.tutorOne)this.tutorOne=t.id||'';
    else if(!this.tutorTwo)this.tutorTwo=t.id||'';
    this.newTutorOpen=false;
  }
  errorText(err:any,fallback:string):string {
    const detail=err?.error?.detail||err?.error?.reason||err?.error?.message||err?.error?.error;
    const readable=typeof err?.error==='string'&&err.error.length<300?err.error:null;
    if(err?.status===401)return 'Tu sesión venció. Cerrá sesión e ingresá de nuevo como Director o Administrativo.';
    if(err?.status===403)return 'Tu perfil no tiene permiso para esta operación.';
    return detail&&typeof detail==='string'?`${fallback}: ${detail}`:readable?`${fallback}: ${readable}`:`${fallback} (HTTP ${err?.status||'sin conexión'}).`;
  }
  submitStudent():void {
    if(this.busy||this.loadingStudent||this.studentLoadFailed)return;
    if(!this.form.firstName?.trim()||!this.form.lastName?.trim()||(this.form.dniStatus==='FISICO'&&!this.form.documentNumber?.trim())||!this.form.birthDate){this.error='Completá nombre, apellido, DNI y nacimiento.';return;}
    if(this.form.dniStatus==='FISICO' && !validNumericDni(this.form.documentNumber)) {
      this.error='El DNI debe tener entre 6 y 12 números, sin puntos ni letras.';return;
    }
    for(const phone of [this.form.studentCellphone, this.form.studentLandlinePhone]) {
      if(!validNumericPhone(phone)) {this.error='Los teléfonos deben contener solamente números (6 a 20).';return;}
    }
    this.birthDateError=validStudentBirthDate(this.form.birthDate,Number(this.form.academicYear));
    if(this.birthDateError){this.error=this.birthDateError;return;}
    if(!this.tutorOne && !this.isEdit){this.error='Seleccioná al menos un tutor responsable.';return;}
    if(this.tutorOne===this.tutorTwo){this.error='El segundo tutor debe ser una persona diferente.';return;}
    if(this.primarySelectionRequired){this.error='Esta matrícula es anterior al registro de tutor principal. Seleccioná expresamente quién es el tutor principal antes de guardar.';return;}
    if(!this.selectableClassrooms.some(room=>room.name===this.form.classroom) || this.roomLoading){
      this.error=this.isEdit?'Elegí un aula registrada del turno seleccionado.':'Calculá y elegí una sala habilitada para su edad y turno.';
      return;
    }
    const tutorIds=[this.tutorOne,this.tutorTwo].filter(Boolean);
    const assignments=toStudentTutorAssignments(tutorIds,this.tutors());
    const {tutors, tutorIds:ignored, contactPhone:ignoredContact, ...payload}=this.form;
    // Nunca enviamos identificadores ni datos de otras instituciones.
    delete payload.id;delete payload.tenantId;delete payload.institutionId;delete payload.createdAt;delete payload.updatedAt;
    this.error='';this.busy=true;
    const wasEditing=!!this.editingId;
    // Alta atómica: incluir referencias a tutores en el mismo POST del alumno.
    // Edición: vincular tutores por subrecurso, sin permitir una lista vacía.
    if(tutorIds.length===0){this.busy=false;this.error='Seleccioná al menos un tutor.';return;}
    const operation=wasEditing?this.students.updateStudent(this.editingId,payload)
      :this.students.createStudent({...payload,tutors:tutorIds.map(id=>({id}))});
    operation.pipe(switchMap((student:any)=>{
      const id=this.editingId||student.id;
      if(!id)throw new Error('El backend no devolvió el ID del alumno.');
      this.editingId=id;
      return wasEditing?this.students.linkTutors(id,assignments):of(void 0);
    })).subscribe({
      next:()=>{this.busy=false;
        if(this.embedded)this.saved.emit(this.editingId);
        else this.router.navigate(['/students',this.editingId]);
      },
      error:e=>{this.busy=false;this.error=this.errorText(e,'No se pudieron guardar el alumno y sus tutores');}
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
