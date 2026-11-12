import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { NgForm } from '@angular/forms';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { ValidateSubmitDirective } from '../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../utils/forms/field-validation.directive';
import { ViewChild, Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudentService } from '../../services/student/student';
import { Student } from '../../models/student';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-student-records',standalone:true,imports: [FieldValidationDirective, ValidateSubmitDirective, FormsModule,RouterLink],templateUrl:'./student-records.html',styleUrl:'./student-records.css'})
export class StudentRecords implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);

  private readonly dialogs=inject(UiDialogService);

  readonly canDiscardForm = canDiscardForm;
  @ViewChild(NgForm) private activeForm?: NgForm;
  async closeMedicalEditor(): Promise<void> {
    if(this.busy || (this.activeForm?.dirty &&
      !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios')))) return;
    this.medicalModal=false;
    this.formCdr.markForCheck();
  }
 students=signal<Student[]>([]);records=signal<any[]>([]);linkedTutors=signal<any[]>([]);medical:any={};medicalDraft:any={};medicalExists=signal(false);medicalModal=false;
 private selectedState=signal('');
 get selectedId():string{return this.selectedState();}
 set selectedId(value:string){this.selectedState.set(value);}
 private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
  private readonly messageState = signal('');
  get message(): string {return this.messageState();}
  set message(value: string) {this.messageState.set(value);}
  private loadingState=signal(false);
 get loading():boolean{return this.loadingState();}
 set loading(value:boolean){this.loadingState.set(value);}
 private readonly busyState = signal(false);
  get busy(): boolean {return this.busyState();}
  set busy(value: boolean) {this.busyState.set(value);}
  studentQuery='';expandedRecord='';private loadGeneration=0;
 mode:'medical'|'pickups'|'restrictions'='medical';editPickupId='';showForm=false;
 pickup:any={fullName:'',documentNumber:'',birthDate:'',relationship:'',phone:''};
 restriction:any={firstName:'',lastName:'',documentType:'DNI',documentNumber:'',description:'',legajoNumber:'',matrixNumber:'',folioNumber:'',inscriptionDate:''};
 medicalTextFields=[
  {key:'obraSocial',label:'¿Tiene obra social? (detalle)'},{key:'detalleObraSocial',label:'Nombre / descripción de obra social'},
  {key:'nroAfiliado',label:'Número de afiliado'},{key:'detalleInternacion',label:'Detalles de internación'},
  {key:'motivoOperacion',label:'Motivo de operación'},{key:'anioOperacion',label:'Año de operación'},
  {key:'cualMedicacion',label:'Medicación habitual y dosis'}];
 medicalGroups=[
  {label:'Antecedentes médicos',fields:[['asma','Asma'],['alergiaGeneral','Alergias'],['problemasCardiacos','Problemas cardíacos'],['diabetes','Diabetes'],['presionArterialElevada','Presión arterial elevada'],['convulsiones','Convulsiones'],['alteracionesSanguineas','Alteraciones sanguíneas'],['quemadurasSeveras','Quemaduras severas'],['faltaOrgano','Falta de órgano'],['enfermedadOncohematologica','Enfermedad oncohematológica'],['inmunodeficiencias','Inmunodeficiencias'],['fracturasLesiones','Fracturas / lesiones'],['otroProblemaHuesos','Otros problemas óseos'],['traumatismoCraneo','Traumatismo craneal'],['problemasPiel','Problemas de piel']]},
  {label:'Síntomas',fields:[['desmayos','Desmayos'],['dolorPecho','Dolor en el pecho'],['mareos','Mareos'],['mayorCansancio','Cansancio excesivo'],['palpitaciones','Palpitaciones'],['dificultadRespirar','Dificultad al respirar']]},
  {label:'Internaciones y operaciones',fields:[['internacionSalaComun','Internación en sala común'],['internacionTerapia','Internación en terapia'],['operacion','Operación']]},
  {label:'Alergias e internaciones asociadas',fields:[['alergiaMedicamentos','Alergia a medicamentos'],['internacionMed','Internación por medicamentos'],['alergiaVacunas','Alergia a vacunas'],['internacionVac','Internación por vacunas'],['alergiaAlimentos','Alergia a alimentos'],['internacionAlim','Internación por alimentos'],['alergiaInsectos','Alergia a insectos'],['internacionIns','Internación por insectos'],['alergiaEstacionales','Alergia estacional'],['internacionEst','Internación por alergia estacional'],['alergiaOtras','Otras alergias'],['internacionOtr','Internación por otras alergias']]},
  {label:'Salud sensorial y medicación',fields:[['disminucionAuditiva','Disminución auditiva'],['usaAudifonos','Usa audífonos'],['disminucionVisual','Disminución visual'],['usaLentes','Usa lentes'],['medicacionHabitual','Medicación habitual']]},
  {label:'Antecedentes familiares',fields:[['muerteSubitaFamiliar','Muerte súbita'],['diabetesFamiliar','Diabetes'],['problemasCardiacosFamiliar','Problemas cardíacos'],['tosCronicaFamiliar','Tos crónica'],['celiaquiaFamiliar','Celiaquía']]}
 ];
 constructor(private route:ActivatedRoute,private api:StudentService){}
 get filteredStudents():Student[]{const q=this.studentQuery.trim().toLowerCase();return this.students().filter(s=>!q||[s.firstName,s.lastName,s.documentNumber,s.classroom].join(' ').toLowerCase().includes(q));}
 get selectedStudent():Student|undefined{return this.students().find(s=>s.id===this.selectedId);}
 get pickupAge():number|null{return /^\d{4}-\d{2}-\d{2}$/.test(this.pickup.birthDate)?this.age(this.pickup.birthDate):null;}
 selectStudent(id:string):void{if(this.selectedId===id)return;this.selectedId=id;this.load();}
 get title():string{return this.mode==='medical'?'Ficha Médica Escolar':this.mode==='pickups'?'Control de Retiros':'Restricciones Judiciales';}
 get canEdit():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'') || (this.mode==='pickups' && sessionStorage.getItem('current_user_role')==='PRECEPTOR');}
 ngOnInit():void {this.mode=(this.route.snapshot.data['mode']||'medical') as any;
  this.api.getStudents().subscribe({next:s=>{this.students.set(s);const query=this.route.snapshot.queryParamMap.get('studentId');const first=(query&&s.some(x=>x.id===query)?query:s[0]?.id)||'';
     if(first){this.selectedId=first;this.load();}},error:()=>this.error='No se pudieron cargar los estudiantes.'});
 }
 load():void {this.error='';this.message='';this.records.set([]);this.linkedTutors.set([]);this.medical={};this.medicalExists.set(false);this.medicalModal=false;this.showForm=false;
  const reqId=++this.loadGeneration;
  if(!this.selectedId)return;
  this.loading=true;
  const id=this.selectedId;
  if(this.mode==='pickups'){
    this.api.getStudentById(id).subscribe({next:s=>{if(reqId===this.loadGeneration)this.linkedTutors.set(s.tutors||[]);},error:()=>{if(reqId===this.loadGeneration)this.error='No se pudieron cargar los responsables vinculados.';}});
  }
  const req=this.mode==='medical'?this.api.getMedicalRecord(id):this.mode==='pickups'?this.api.getAuthorizedPickups(id):this.api.getJudicialRestrictions(id);
  req.subscribe({next:result=>{if(reqId!==this.loadGeneration)return;this.loading=false;if(this.mode==='medical'){this.medical=result||{};this.medicalExists.set(!!result?.id);}else this.records.set(result||[]);},
     error:()=>{if(reqId!==this.loadGeneration)return;this.loading=false;this.error='No se pudieron consultar los registros del alumno.';}});
 }
 openMedical():void {if(!this.canEdit)return;this.medicalDraft={...this.medical};this.medicalModal=true;this.error='';}
 saveMedical():void {if(this.busy)return;
if(!this.selectedId||!this.canEdit)return;this.busy=true;this.error='';
  this.api.saveMedicalRecord(this.selectedId,this.medicalDraft).subscribe({next:()=>{this.busy=false;this.medicalModal=false;this.load();this.message='Ficha médica guardada.';},error:e=>{this.busy=false;this.error='No se pudo guardar la ficha médica (HTTP '+(e.status||'sin conexión')+').';}});
 }
 authorizeTutor(t:any):void {
  this.openPickup({fullName:`${t.firstName||''} ${t.lastName||''}`.trim(),documentNumber:t.documentNumber||'',relationship:t.relationship||'TUTOR_LEGAL',phone:t.phone||'',birthDate:''});
  this.editPickupId='';
 }
 openPickup(item?:any):void {this.error='';this.showForm=true;this.editPickupId=item?.id||'';this.pickup=item?{...item}:{fullName:'',documentNumber:'',birthDate:'',relationship:'',phone:''};}
 savePickup():void {if(this.busy)return;

  if(!this.selectedId || !this.pickup.fullName?.trim() || !this.pickup.documentNumber?.trim() ||
     !this.pickup.birthDate || !this.pickup.relationship?.trim() || !this.pickup.phone?.trim()) {
    this.error='Completá nombre, DNI, nacimiento, vínculo y teléfono del autorizado.';
    return;
  }
  const dni = String(this.pickup.documentNumber).trim();
  if(!/^\d{6,12}$/.test(dni)) {this.error='El DNI del autorizado debe tener de 6 a 12 dígitos.';return;}
  this.pickup.documentNumber=dni;
  if(!/^[0-9]{6,20}$/.test(String(this.pickup.phone).trim())){this.error='El teléfono debe tener solo números, de 6 a 20 dígitos.';return;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(this.pickup.birthDate) || !Number.isFinite(this.age(this.pickup.birthDate))){this.error='Ingresá una fecha de nacimiento válida.';return;}
  const age=this.age(this.pickup.birthDate);if(age<18){this.error='La persona autorizada debe ser mayor de 18 años.';return;}
  this.busy=true;this.error='';const data={...this.pickup,age};const req=this.editPickupId?this.api.updateAuthorizedPickup(this.selectedId,this.editPickupId,data):this.api.createAuthorizedPickup(this.selectedId,data);
  req.subscribe({next:()=>{this.busy=false;this.load();},error:e=>{this.busy=false;this.error='No se pudo guardar la autorización (HTTP '+(e.status||'sin conexión')+').';}});
 }
 age(date:string):number {const born=new Date(date+'T12:00:00');const today=new Date();return today.getFullYear()-born.getFullYear()-(today.getMonth()<born.getMonth()||(today.getMonth()===born.getMonth()&&today.getDate()<born.getDate())?1:0);}
 async removePickup(id:string):Promise<void>{if(!this.selectedId||!(await this.dialogs.confirm('¿Eliminar esta persona autorizada?')))return;this.api.deleteAuthorizedPickup(this.selectedId,id).subscribe({next:()=>this.load(),error:()=>this.error='No se pudo eliminar el autorizado.'});}
 saveRestriction():void {if(this.busy)return;

  if(!this.selectedId || !this.restriction.firstName?.trim() || !this.restriction.lastName?.trim() ||
     !this.restriction.documentType?.trim() || !this.restriction.documentNumber?.trim() ||
     !this.restriction.description?.trim()){
    this.error='Completá nombre, apellido, tipo y número de documento y descripción de la medida.';
    return;
  }
  if(!/^[0-9]{6,12}$/.test(String(this.restriction.documentNumber).trim())){this.error='El DNI de la restricción debe ser solo numérico (6 a 12 dígitos).';return;}
  this.busy=true;this.error='';this.api.createJudicialRestriction(this.selectedId,this.restriction).subscribe({next:()=>{this.busy=false;this.load();},error:e=>{this.busy=false;this.error='No se pudo guardar la restricción (HTTP '+(e.status||'sin conexión')+').';}});
 }
 async removeRestriction(id:string):Promise<void>{if(!this.selectedId||!(await this.dialogs.confirm('¿Eliminar esta restricción judicial?')))return;this.api.deleteJudicialRestriction(this.selectedId,id).subscribe({next:()=>this.load(),error:()=>this.error='No se pudo eliminar la restricción.'});}

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
