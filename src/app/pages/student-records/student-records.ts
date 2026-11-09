import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudentService } from '../../services/student/student';
import { Student } from '../../models/student';

@Component({selector:'app-student-records',standalone:true,imports:[FormsModule,RouterLink],templateUrl:'./student-records.html',styleUrl:'./student-records.css'})
export class StudentRecords implements OnInit {
 students=signal<Student[]>([]);records=signal<any[]>([]);linkedTutors=signal<any[]>([]);medical:any={};medicalDraft:any={};medicalExists=signal(false);medicalModal=false;
 private selectedState=signal('');
 get selectedId():string{return this.selectedState();}
 set selectedId(value:string){this.selectedState.set(value);}
 error='';message='';private loadingState=signal(false);
 get loading():boolean{return this.loadingState();}
 set loading(value:boolean){this.loadingState.set(value);}
 busy=false;studentQuery='';expandedRecord='';private loadGeneration=0;
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
 saveMedical():void {if(!this.selectedId||!this.canEdit)return;this.busy=true;this.error='';
  this.api.saveMedicalRecord(this.selectedId,this.medicalDraft).subscribe({next:()=>{this.busy=false;this.medicalModal=false;this.load();this.message='Ficha médica guardada.';},error:e=>{this.busy=false;this.error='No se pudo guardar la ficha médica (HTTP '+(e.status||'sin conexión')+').';}});
 }
 authorizeTutor(t:any):void {
  this.openPickup({fullName:`${t.firstName||''} ${t.lastName||''}`.trim(),documentNumber:t.documentNumber||'',relationship:t.relationship||'TUTOR_LEGAL',phone:t.phone||'',birthDate:''});
  this.editPickupId='';
 }
 openPickup(item?:any):void {this.error='';this.showForm=true;this.editPickupId=item?.id||'';this.pickup=item?{...item}:{fullName:'',documentNumber:'',birthDate:'',relationship:'',phone:''};}
 savePickup():void {if(!this.selectedId||!this.pickup.fullName.trim()||!this.pickup.documentNumber.trim()||!this.pickup.birthDate)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(this.pickup.birthDate) || !Number.isFinite(this.age(this.pickup.birthDate))){this.error='Ingresá una fecha de nacimiento válida.';return;}
  const age=this.age(this.pickup.birthDate);if(age<18){this.error='La persona autorizada debe ser mayor de 18 años.';return;}
  this.busy=true;this.error='';const data={...this.pickup,age};const req=this.editPickupId?this.api.updateAuthorizedPickup(this.selectedId,this.editPickupId,data):this.api.createAuthorizedPickup(this.selectedId,data);
  req.subscribe({next:()=>{this.busy=false;this.load();},error:e=>{this.busy=false;this.error='No se pudo guardar la autorización (HTTP '+(e.status||'sin conexión')+').';}});
 }
 age(date:string):number {const born=new Date(date+'T12:00:00');const today=new Date();return today.getFullYear()-born.getFullYear()-(today.getMonth()<born.getMonth()||(today.getMonth()===born.getMonth()&&today.getDate()<born.getDate())?1:0);}
 removePickup(id:string):void {if(!this.selectedId||!confirm('¿Eliminar esta persona autorizada?'))return;this.api.deleteAuthorizedPickup(this.selectedId,id).subscribe({next:()=>this.load(),error:()=>this.error='No se pudo eliminar el autorizado.'});}
 saveRestriction():void {if(!this.selectedId||!this.restriction.firstName.trim()||!this.restriction.lastName.trim()||!this.restriction.description.trim())return;
  this.busy=true;this.error='';this.api.createJudicialRestriction(this.selectedId,this.restriction).subscribe({next:()=>{this.busy=false;this.load();},error:e=>{this.busy=false;this.error='No se pudo guardar la restricción (HTTP '+(e.status||'sin conexión')+').';}});
 }
 removeRestriction(id:string):void {if(!this.selectedId||!confirm('¿Eliminar esta restricción judicial?'))return;this.api.deleteJudicialRestriction(this.selectedId,id).subscribe({next:()=>this.load(),error:()=>this.error='No se pudo eliminar la restricción.'});}
}
