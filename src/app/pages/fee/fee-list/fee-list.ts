import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { getMultiTenantHeaders } from '../../../services/tenant/tenant';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { from, concatMap, toArray, forkJoin } from 'rxjs';
import { FeeService } from '../../../services/fee/fee';
import { StudentService } from '../../../services/student/student';
import { TenantService } from '../../../services/tenant/tenant';

@Component({ selector:'app-fee-list', standalone:true, imports:[CommonModule,FormsModule], templateUrl:'./fee-list.html', styleUrl:'./fee-list.css' })
export class FeeList implements OnInit {
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
  error='';message='';loading=true;busy=false;emailBusy=false;editMode=false;showEmailModal=false;
  private pending=new Set<number>();
  months=[{number:0,name:'Matrícula'},...['Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((name,i)=>({number:i+3,name}))];
  constructor(private studentsApi:StudentService, private feesApi:FeeService,private school:TenantService,private http:HttpClient,private route:ActivatedRoute){}
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
      ?this.http.get<any[]>('http://localhost:8080/api/v1/auth/my-students',{headers:getMultiTenantHeaders()})
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
    this.feesApi.getInstitutionalEmails().subscribe({next:e=>this.emails={...this.emails,...e},error:()=>{ /* No impide consultar cuotas */ }});
  }
  openStudent(id:string):void{
    if(!this.academicYear || this.loading){this.error='Esperá a que cargue el ciclo lectivo de la institución.';return;}
    this.selectedStudentId=id;this.editMode=false;this.pending.clear();this.loadFees();
  }
  closeStudent():void{++this.requestId;this.selectedStudentId='';this.editMode=false;this.pending.clear();this.feesLoading=false;this.fees.set([]);this.message='';}
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
  cancelEdit():void{this.editMode=false;this.pending.clear();}
  savePayments():void{if(!this.canEdit||this.busy||!this.selectedStudentId)return;
    const changes=[...this.pending];if(!changes.length){this.cancelEdit();return;}
    this.busy=true;this.error='';this.message='';
    from(changes).pipe(concatMap(month=>this.feesApi.toggleStudentFee(this.selectedStudentId,this.academicYear,month)),toArray()).subscribe({
      next:()=>{this.busy=false;this.message='Se guardaron los cambios de pagos.';this.cancelEdit();this.loadFees();},
      error:e=>{this.busy=false;this.cancelEdit();this.loadFees();this.error=this.readError(e,'No se pudieron guardar todos los pagos. Se recargó el estado real; verificá los meses antes de reintentar.');}
    });
  }
  saveEmails():void{if(!this.canEdit)return;this.emailBusy=true;this.error='';this.message='';
    this.feesApi.updateInstitutionalEmails(this.emails).subscribe({next:()=>{this.emailBusy=false;this.showEmailModal=false;this.message='Correos institucionales actualizados.';},error:e=>{this.emailBusy=false;this.error=this.readError(e,'No se pudieron guardar los correos.');}});
  }
  readError(e:any,fallback:string):string{return e?.error?.message||e?.error?.detail||`${fallback} (HTTP ${e?.status||'sin conexión'})`;}
}
