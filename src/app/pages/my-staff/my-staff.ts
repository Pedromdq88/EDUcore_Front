import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { ValidateSubmitDirective } from '../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../utils/forms/field-validation.directive';
import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../services/portfolios/portfolios';
import { getMultiTenantHeaders } from '../../services/tenant/tenant';
interface Assignment { classroom:string; subject:string; shift:string }
interface StaffProfile {firstName:string;lastName:string;email:string;role:string;phone:string;assignments:Assignment[]}
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-my-staff',standalone:true,imports: [FieldValidationDirective, ValidateSubmitDirective, FormsModule],templateUrl:'./my-staff.html',styleUrl:'./my-staff.css'})
export class MyStaff implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);

  private readonly dialogs=inject(UiDialogService);

  readonly canDiscardForm = canDiscardForm;
  profile=signal<(StaffProfile & {id:string})|null>(null);private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
  loading=true;
  portfolios=signal<any[]>([]);showPortfolioForm=false;private readonly portfolioBusyState = signal(false);
  get portfolioBusy(): boolean {return this.portfolioBusyState();}
  set portfolioBusy(value: boolean) {this.portfolioBusyState.set(value);}
  private readonly portfolioErrorState = signal('');
  get portfolioError(): string {return this.portfolioErrorState();}
  set portfolioError(value: string) {this.portfolioErrorState.set(value);}
  portfolioEditId='';
  portfolio:any={title:'',description:'',category:'CURSO',activityDate:new Date().toISOString().slice(0,10),mediaUrl:''};
  get isTeacher():boolean{return sessionStorage.getItem('current_user_role')==='TEACHER';}
  constructor(private http:HttpClient,private portfolioService:PortfolioService){}
  ngOnInit():void {this.http.get<StaffProfile>('/api/v1/auth/my-staff',
   {headers:getMultiTenantHeaders()}).subscribe({next:p=>{this.profile.set(p as StaffProfile & {id:string});this.loading=false;if(this.isTeacher)this.loadPortfolios();},
     error:()=>{this.loading=false;this.error='No se pudo consultar tu perfil. Verificá que el legajo esté vinculado.';}});}
  loadPortfolios():void {
    const id=this.profile()?.id;if(!id)return;
    this.portfolioService.getPortfoliosByStaff(id).subscribe({next:list=>this.portfolios.set(list),
      error:()=>this.portfolioError='No se pudieron cargar tus portfolios.'});
  }
  startPortfolio(item?:any):void {
    this.portfolioEditId=item?.id||'';
    this.portfolio=item?{title:item.title,category:item.category,description:item.description,
      activityDate:item.activityDate,mediaUrl:item.mediaUrl||''}:
      {title:'',description:'',category:'CURSO',activityDate:new Date().toISOString().slice(0,10),mediaUrl:''};
    this.showPortfolioForm=true;
  }
  savePortfolio():void {if(this.portfolioBusy)return;

    if(!this.isTeacher||!this.profile()?.id||!this.portfolio.title.trim()||!this.portfolio.description.trim())return;
    this.portfolioBusy=true;this.portfolioError='';
    const data={...this.portfolio,staffId:this.profile()!.id};
    const request=this.portfolioEditId?this.portfolioService.updatePortfolio(this.portfolioEditId,data):
      this.portfolioService.createPortfolio(data);
    request.subscribe({next:()=>{this.portfolioBusy=false;this.showPortfolioForm=false;this.loadPortfolios();},
      error:()=>{this.portfolioBusy=false;this.portfolioError='No se pudo guardar el portfolio.';}});
  }
  async deletePortfolio(id:string):Promise<void>{
    if(!this.isTeacher||!(await this.dialogs.confirm('¿Eliminar este portfolio?')))return;
    this.portfolioService.deletePortfolio(id).subscribe({next:()=>this.loadPortfolios(),
      error:()=>this.portfolioError='No se pudo eliminar el portfolio.'});
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
