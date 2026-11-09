import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { validStudentBirthDate, studentAgeAtCutoff } from '../../../utils/classroom-date';
import { TutorModal } from '../../../components/tutor-modal/tutor-modal';
import { StudentService } from '../../../services/student/student';
import { TutorService } from '../../../services/tutor/tutor';
import { TenantService } from '../../../services/tenant/tenant';

interface RoomOption { id:string; name:string; minimumAge:number; shift:string; }
interface RoomEligibility { ageAtCutoff:number|null; cutoffDate:string; options:RoomOption[]; message:string; }

@Component({selector:'app-student-form',standalone:true,imports:[CommonModule,FormsModule,RouterLink,TutorModal],templateUrl:'./student-form.html',styleUrl:'./student-form.css'})
export class StudentForm implements OnInit {
  @Input() embedded = false;
  @Input() studentId = '';
  @Output() saved = new EventEmitter<string>();
  @Output() dismissed = new EventEmitter<void>();
  tutors=signal<any[]>([]);
  eligibility=signal<RoomEligibility | null>(null);
  editingId=''; busy=false; error=''; message=''; loadingStudent=false; studentLoadFailed=false;
  roomLoading=false; private roomRequest=0; birthDateError='';
  newTutorOpen=false;
  tutorOne='';tutorTwo=''; tutorSearch=''; activeYearLoading=true;
  tutorDropdown:1|2|0=0;
  get selectedTutorOne():any{return this.tutors().find(t=>t.id===this.tutorOne);}
  get selectedTutorTwo():any{return this.tutors().find(t=>t.id===this.tutorTwo);}
  toggleTutorPicker(which:1|2):void{this.tutorSearch='';this.tutorDropdown=this.tutorDropdown===which?0:which;}
  chooseTutor(which:1|2, id:string):void{
    if(which===1){if(this.tutorTwo===id)this.tutorTwo='';this.tutorOne=id;}
    else {if(this.tutorOne===id)this.tutorOne='';this.tutorTwo=id;}
    this.tutorDropdown=0;this.tutorSearch='';
  }
  clearTutor(which:1|2):void{if(which===1)this.tutorOne='';else this.tutorTwo='';this.tutorDropdown=0;}
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
  form:any={firstName:'',lastName:'',documentNumber:'',legajoNumber:'',birthDate:'',classroom:'',studentShift:'MANANA',academicYear:new Date().getFullYear(),status:'ACTIVE',cuil:'',dniStatus:'FISICO',hasCpi:false,hasForeignDocument:false,foreignDocumentType:'',foreignDocumentNumber:'',genderIdentity:'NO_RESPONDE',birthCountry:'ARGENTINA',nationality:'Argentina',birthProvince:'Buenos Aires',birthDistrict:'',birthLocality:'',street:'',streetNumber:'',floor:'',tower:'',apartment:'',betweenStreets:'',addressDistrict:'',addressLocality:'',otherAddressDetails:'',studentLandlinePhone:'',studentCellphone:'',hasSiblings:false,siblingCount:0,siblingsInThisSchool:0,receivesAuh:false,belongsToNativePeople:false,speaksOtherLanguageAtHome:false,indigenousLanguage:false,otherLanguage:false,transportationMethods:'A_PIE',contactPhone:'',gender:'',bloodType:'',healthInsurance:'',allergies:'',birthPlace:'',address:''};
  constructor(private students:StudentService, private tutorApi:TutorService, private tenantApi:TenantService, private route:ActivatedRoute, private router:Router){}
  get isEdit():boolean{return !!this.editingId;}
  ngOnInit():void {
    this.editingId=this.studentId||this.route.snapshot.paramMap.get('id')||'';
    this.tenantApi.getProfile().subscribe({next:p=>{
      const year=Number((p.profile||p)?.academicYear);
      if(year>=2000&&year<=2100){this.form.academicYear=year;this.refreshClassrooms();}
      this.activeYearLoading=false;
    },error:()=>{this.activeYearLoading=false;this.error='No se pudo recuperar el ciclo lectivo activo de la escuela.';}});
    this.tutorApi.getTutors().subscribe({next:rows=>this.tutors.set(rows),error:e=>this.error=this.errorText(e,'No se pudieron cargar los tutores')});
    if(this.isEdit){
      this.loadingStudent=true;
      this.students.getStudentById(this.editingId).subscribe({
        next:s=>{
          this.form={...this.form,...s,birthDate:(s.birthDate||'').substring(0,10),studentShift:s.studentShift||this.form.studentShift,academicYear:s.academicYear||this.form.academicYear};
          this.tutorOne=s.tutors?.[0]?.id||'';
          this.tutorTwo=s.tutors?.[1]?.id||'';
          this.loadingStudent=false;
          this.refreshClassrooms();
        }, error:e=>{
          this.loadingStudent=false; this.studentLoadFailed=true;
          this.error=this.errorText(e,'No se pudo cargar la ficha existente; no se permite editar en blanco');
        }
      });
    }
  }
  get previewAge():number|null{return studentAgeAtCutoff(this.form.birthDate, Number(this.form.academicYear));}
  get rooms():RoomOption[]{return this.eligibility()?.options||[];}
  get calculatedAge():number|null{return this.eligibility()?.ageAtCutoff??null;}
  get canSubmit():boolean{return !this.activeYearLoading && !this.busy && !this.loadingStudent && !this.studentLoadFailed && !this.roomLoading && this.rooms.length>0 && this.rooms.some(r=>r.name===this.form.classroom);}
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
        if(!info.options.some(o=>o.name===this.form.classroom)) this.form.classroom=info.options[0]?.name||'';
        this.roomLoading=false;
      },error:e=>{
        if(request!==this.roomRequest)return;
        this.eligibility.set({ageAtCutoff:null,cutoffDate:'',options:[],message:this.errorText(e,'No se pudo calcular la sala')});
        this.form.classroom='';this.roomLoading=false;
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
    if(!this.form.firstName?.trim()||!this.form.lastName?.trim()||!this.form.documentNumber?.trim()||!this.form.birthDate){this.error='Completá nombre, apellido, DNI y nacimiento.';return;}
    this.birthDateError=validStudentBirthDate(this.form.birthDate,Number(this.form.academicYear));
    if(this.birthDateError){this.error=this.birthDateError;return;}
    if(!this.tutorOne){this.error='Seleccioná al menos un tutor responsable.';return;}
    if(this.tutorOne===this.tutorTwo){this.error='El segundo tutor debe ser una persona diferente.';return;}
    if(!this.rooms.some(room=>room.name===this.form.classroom) || this.roomLoading){this.error='Calculá y elegí una sala habilitada para su edad y turno. Si no hay opciones, registrá primero aulas en el gestor.';return;}
    const tutorIds=[this.tutorOne,this.tutorTwo].filter(Boolean);
    const assignments=tutorIds.map((id,i)=>({tutorId:id,relationshipType:this.tutors().find(t=>t.id===id)?.relationship||'TUTOR_LEGAL',isPrimary:i===0}));
    const {tutors, tutorIds:ignored, ...payload}=this.form;
    // Nunca enviamos identificadores ni datos de otras instituciones.
    delete payload.id;delete payload.tenantId;delete payload.institutionId;delete payload.createdAt;delete payload.updatedAt;
    this.error='';this.busy=true;
    const operation=this.editingId?this.students.updateStudent(this.editingId,payload):this.students.createStudent(payload);
    operation.pipe(switchMap((student:any)=>{
      const id=this.editingId||student.id;
      if(!id)throw new Error('El backend no devolvió el ID del alumno.');
      this.editingId=id;
      return assignments.length?this.students.linkTutors(id,assignments):of(null);
    })).subscribe({
      next:()=>{this.busy=false;
        if(this.embedded)this.saved.emit(this.editingId);
        else this.router.navigate(['/students',this.editingId]);
      },
      error:e=>{this.busy=false;this.error=this.errorText(e,'No se pudieron guardar el alumno y sus tutores');}
    });
  }
}
