import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../../utils/forms/form-ux';
import { ValidateSubmitDirective } from '../../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../../utils/forms/field-validation.directive';
import { validEmail, normalizedEmail } from '../../../validators/identity.validator';
import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { getMultiTenantHeaders } from '../../../services/tenant/tenant';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { from, concatMap, toArray, forkJoin } from 'rxjs';
import { FeeService } from '../../../services/fee/fee';
import { EmailVerificationService } from '../../../services/verification/email-verification';
import { StudentService } from '../../../services/student/student';
import { TenantService } from '../../../services/tenant/tenant';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager, selector:'app-fee-list', standalone:true, imports: [FieldValidationDirective, ValidateSubmitDirective, CommonModule,FormsModule], templateUrl:'./fee-list.html', styleUrl:'./fee-list.css' })
export class FeeList implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);

  private readonly dialogs=inject(UiDialogService);

  readonly canDiscardForm = canDiscardForm;
  students=signal<any[]>([]);fees=signal<any[]>([]);
  classroom='ALL'; query='';
  private selectedStudentState=signal('');
  get selectedStudentId():string{return this.selectedStudentState();}
  set selectedStudentId(id:string){this.selectedStudentState.set(id);}
  private academicYearState=signal(0);
  get academicYear():number{return this.academicYearState();}
  set academicYear(value:number){this.academicYearState.set(value);}
  private feesLoadingState=signal(false);
  get feesLoading():boolean{return this.feesLoadingState();}
  set feesLoading(value:boolean){this.feesLoadingState.set(value);}
  private requestId=0;
  emails:any={receiptEmail:'',feeQueryEmail:''};
  private savedEmails:any={receiptEmail:'',feeQueryEmail:''};
  emailCode:{receiptEmail:string;feeQueryEmail:string}={receiptEmail:'',feeQueryEmail:''};
  confirmedEmail:{receiptEmail:string;feeQueryEmail:string}={receiptEmail:'',feeQueryEmail:''};
  emailVerificationBusy=false;
  emailVerificationMessage='';
  private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
  private readonly messageState = signal('');
  get message(): string {return this.messageState();}
  set message(value: string) {this.messageState.set(value);}
  loading=true;private readonly busyState = signal(false);
  get busy(): boolean {return this.busyState();}
  set busy(value: boolean) {this.busyState.set(value);}
  private readonly emailBusyState = signal(false);
  get emailBusy(): boolean {return this.emailBusyState();}
  set emailBusy(value: boolean) {this.emailBusyState.set(value);}
  editMode=false;showEmailModal=false;
  private pending=new Set<number>();
  months=[{number:0,name:'Matrícula'},...['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((name,i)=>({number:i+3,name}))];
  constructor(private studentsApi:StudentService, private feesApi:FeeService,private school:TenantService,private http:HttpClient,private route:ActivatedRoute,private emailVerification:EmailVerificationService){}
  get isTutor():boolean{return sessionStorage.getItem('current_user_role')==='TUTOR';}
  get canEdit():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
  get rooms():string[]{return [...new Set(this.activeStudents.map(s=>s.classroom).filter(Boolean))].sort();}
  get activeStudents():any[]{return this.students().filter(s=>!this.academicYear||Number(s.academicYear)===this.academicYear);}
  get filteredStudents():any[]{const q=this.query.trim().toLocaleLowerCase('es');return this.activeStudents.filter(s=>
    (this.classroom==='ALL'||s.classroom===this.classroom) && (!q||[s.firstName,s.lastName,s.documentNumber,s.classroom].join(' ').toLocaleLowerCase('es').includes(q)) );}
  get selectedStudent():any{return this.activeStudents.find(s=>s.id===this.selectedStudentId);}
  get pendingCount():number{return this.pending.size;}
  ngOnInit():void{
    // Esperamos ambas respuestas antes de habilitar la selección: nunca se consulta
    // una cuota con academicYear=0 ni se deja el panel sin actualizar.
    const source=this.isTutor
      ?this.http.get<any[]>('/api/v1/auth/my-students',{headers:getMultiTenantHeaders()})
      :this.studentsApi.getStudents();
    forkJoin({profile:this.school.getProfile(), students:source}).subscribe({
      next:({profile,students})=>{
        const year=Number((profile.profile||profile).academicYear);
        this.academicYear=year;
        this.loading=false;
        this.students.set(students);
        const requestedId=this.route.snapshot.queryParamMap.get('studentId');
        if(requestedId && students.some(s=>s.id===requestedId) && Number.isInteger(year) && year>2000){
          this.openStudent(requestedId);
        }
        if(!Number.isInteger(year)||year<2000) this.error='La escuela no tiene un ciclo lectivo válido.';
      },
      error:e=>{this.loading=false;this.error=this.readError(e,'No se pudieron cargar el ciclo lectivo y los alumnos.');}
    });
    this.feesApi.getInstitutionalEmails().subscribe({next:e=>{this.emails={...this.emails,...e};this.savedEmails={...this.emails};this.formCdr.markForCheck();},error:()=>{this.formCdr.markForCheck();}});
  }
  openStudent(id:string):void{
    if(!this.academicYear || this.loading){this.error='Esperá a que cargue el ciclo lectivo de la institución.';return;}
    this.selectedStudentId=id;this.editMode=false;this.pending.clear();this.loadFees();
  }
  async closeStudent():Promise<void>{if(this.pending.size > 0 && !(await this.dialogs.confirm('Tenés cambios de cuotas sin guardar. ¿Querés descartarlos?')))return;++this.requestId;this.selectedStudentId='';this.editMode=false;this.pending.clear();this.feesLoading=false;this.fees.set([]);this.message='';}
  loadFees():void{
    if(!this.selectedStudentId||!this.academicYear)return;
    const request=++this.requestId;
    const student=this.selectedStudentId;
    const year=this.academicYear;
    this.feesLoading=true;this.error='';this.fees.set([]);
    this.feesApi.getStudentFees(student,year).subscribe({
      next:items=>{if(request!==this.requestId)return;this.fees.set(items);this.feesLoading=false;},
      error:e=>{if(request!==this.requestId)return;this.feesLoading=false;this.error=this.readError(e,'No se pudieron consultar las cuotas.');}
    });
  }
  feeFor(number:number):any{return this.fees().find(f=>Number(f.monthNumber)===number);}
  statusFor(number:number):string{const f=this.feeFor(number);if(!f)return 'INACTIVE';
    if(this.pending.has(number))return f.status==='PAID'?'PENDING':'PAID';return String(f.status||'INACTIVE').toUpperCase();
  }
  togglePreview(number:number):void{if(!this.editMode||!this.canEdit||this.busy)return;
    if(this.pending.has(number))this.pending.delete(number);else this.pending.add(number);
  }
  async cancelEdit(ask = true):Promise<void>{
    if(ask && this.pending.size > 0 && !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?')))return;
    this.editMode=false;this.pending.clear();
  }
  savePayments():void{if(!this.canEdit||this.busy||!this.selectedStudentId)return;
    const changes=[...this.pending];if(!changes.length){this.cancelEdit();return;}
    this.busy=true;this.error='';this.message='';
    from(changes).pipe(concatMap(month=>this.feesApi.toggleStudentFee(this.selectedStudentId,this.academicYear,month)),toArray()).subscribe({
      next:()=>{this.busy=false;this.message='Se guardaron los cambios de pagos.';this.cancelEdit(false);this.loadFees();},
      error:e=>{this.busy=false;this.cancelEdit(false);this.loadFees();this.error=this.readError(e,'No se pudieron guardar todos los pagos. Se recargó el estado real; verificá los meses antes de reintentar.');}
    });
  }
  openEmailModal(): void {
    this.emails={...this.savedEmails};
    this.error='';this.emailVerificationMessage='';
    this.emailCode={receiptEmail:'',feeQueryEmail:''};
    this.confirmedEmail={receiptEmail:'',feeQueryEmail:''};
    this.showEmailModal=true;
  }
  needsEmailVerification(field:'receiptEmail'|'feeQueryEmail'):boolean {
    const entered=normalizedEmail(String(this.emails[field]||''));
    return !!entered && entered!==normalizedEmail(String(this.savedEmails[field]||''));
  }
  isEmailVerified(field:'receiptEmail'|'feeQueryEmail'):boolean {
    const entered=normalizedEmail(String(this.emails[field]||''));
    return !this.needsEmailVerification(field) || Object.values(this.confirmedEmail).includes(entered);
  }
  onEmailEdited(field:'receiptEmail'|'feeQueryEmail'):void {
    this.emailVerificationMessage='';
    this.error='';
    this.confirmedEmail[field]='';
    this.emailCode[field]='';
  }
  requestEmailVerification(field:'receiptEmail'|'feeQueryEmail'):void {
    if(this.emailVerificationBusy || this.emailBusy)return;
    const address=normalizedEmail(String(this.emails[field]||''));
    if(!validEmail(address)){this.error='Completá primero un correo válido.';return;}
    this.emailVerificationBusy=true;this.error='';this.emailVerificationMessage='';
    this.emailVerification.request(address).subscribe({
      next:result=>{this.emailVerificationBusy=false;this.emailVerificationMessage=result.message;this.formCdr.markForCheck();},
      error:e=>{this.emailVerificationBusy=false;this.error=this.readError(e,'No se pudo enviar el código de verificación.');this.formCdr.markForCheck();}
    });
  }
  confirmEmailVerification(field:'receiptEmail'|'feeQueryEmail'):void {
    if(this.emailVerificationBusy || this.emailBusy)return;
    const address=normalizedEmail(String(this.emails[field]||''));
    const code=(this.emailCode[field]||'').trim();
    if(!/^[0-9]{6}$/.test(code)){this.error='Ingresá los seis números del código recibido por correo.';return;}
    this.emailVerificationBusy=true;this.error='';this.emailVerificationMessage='';
    this.emailVerification.confirm(address,code).subscribe({
      next:result=>{
        this.emailVerificationBusy=false;
        if(result.valid)this.confirmedEmail[field]=address;
        else this.error=result.message;
        this.emailVerificationMessage=result.valid?result.message:'';
        this.formCdr.markForCheck();
      },error:e=>{this.emailVerificationBusy=false;this.error=this.readError(e,'No se pudo verificar el código.');this.formCdr.markForCheck();}
    });
  }
  async closeEmailModal(form: NgForm): Promise<void> {
    if(this.emailBusy || (form?.dirty &&
        !(await this.dialogs.confirm('Tenés correos modificados sin guardar. ¿Querés descartarlos?', 'Descartar cambios')))) return;
    this.emails={...this.savedEmails};
    this.emailVerificationMessage='';
    this.showEmailModal=false;
    this.formCdr.markForCheck();
  }
  saveEmails():void{if(this.emailBusy)return;
    if(!this.canEdit)return;
    const receiptEmail = String(this.emails.receiptEmail || '').trim();
    const feeQueryEmail = String(this.emails.feeQueryEmail || '').trim();
    if(!validEmail(receiptEmail) || !validEmail(feeQueryEmail)){
      this.error='Los dos correos de cuotas son obligatorios y deben tener un formato válido.';
      return;
    }
    if(!this.isEmailVerified('receiptEmail') || !this.isEmailVerified('feeQueryEmail')) {
      this.error='Antes de guardar los correos nuevos, enviá y confirmá los códigos recibidos.';
      return;
    }
    this.emails={...this.emails, receiptEmail:normalizedEmail(receiptEmail), feeQueryEmail:normalizedEmail(feeQueryEmail)};
    this.emailBusy=true;this.error='';this.message='';
    this.feesApi.updateInstitutionalEmails(this.emails).subscribe({next:()=>{this.emailBusy=false;this.savedEmails={...this.emails};this.showEmailModal=false;this.message='Correos institucionales actualizados.';this.formCdr.markForCheck();},error:e=>{this.emailBusy=false;this.error=this.readError(e,'No se pudieron guardar los correos.');this.formCdr.markForCheck();}});
  }
  readError(e:any,fallback:string):string{return e?.error?.message||e?.error?.detail||`${fallback} (HTTP ${e?.status||'sin conexión'})`;}
}
