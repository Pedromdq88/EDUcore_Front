import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { ValidateSubmitDirective } from '../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../utils/forms/field-validation.directive';
import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { getMultiTenantHeaders } from '../../services/tenant/tenant';
interface Assignment { classroom:string; subject:string; shift:string }
interface StaffProfile {
  id:string; firstName:string; lastName:string; email:string; role:string;
  phone:string; documentNumber:string; hireDate:string; classroom:string;
  assignments:Assignment[];
}
interface PersonalInfo {firstName:string;lastName:string;documentNumber:string;phone:string}
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-my-staff',standalone:true,imports: [FieldValidationDirective, ValidateSubmitDirective, FormsModule, ReactiveFormsModule],templateUrl:'./my-staff.html',styleUrl:'./my-staff.css'})
export class MyStaff implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);

  private readonly dialogs=inject(UiDialogService);

  readonly canDiscardForm = canDiscardForm;
  profile=signal<StaffProfile|null>(null);private readonly errorState = signal('');
  editingPersonal=false; savingPersonal=false; personalError=''; personalSuccess='';
  firstName: FormControl<string|null>;
  lastName: FormControl<string|null>;
  documentNumber: FormControl<string|null>;
  phone: FormControl<string|null>;
  personalForm: FormGroup;
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
  get canManagePortfolio(): boolean { return !!this.profile()?.id && ['DIRECTOR', 'ADMINISTRATIVE', 'PRECEPTOR', 'TEACHER'].includes(this.profile()?.role || ''); }
  private readonly myPortfoliosUrl = '/api/v1/profile/staff/portfolios';
  constructor(private http: HttpClient){
    this.firstName = new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
    this.lastName = new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]);
    this.documentNumber = new FormControl('', [Validators.pattern(/^[0-9]{6,12}$/)]);
    this.phone = new FormControl('', [Validators.pattern(/^[0-9]{6,20}$/)]);
    this.personalForm = new FormGroup({
      firstName: this.firstName,
      lastName: this.lastName,
      documentNumber: this.documentNumber,
      phone: this.phone
    });
  }

  startPersonalEdit():void {
    const p=this.profile();
    if(!p)return;
    this.personalError='';this.personalSuccess='';
    this.personalForm.reset({
      firstName:p.firstName,
      lastName:p.lastName,
      documentNumber:p.documentNumber||'',
      phone:p.phone||''
    });
    this.editingPersonal=true;
    this.formCdr.markForCheck();
  }

  async cancelPersonalEdit():Promise<void> {
    if(this.savingPersonal)return;
    if(this.personalForm.dirty && !(await this.dialogs.confirm(
      'Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios'
    )))return;
    this.editingPersonal=false;
    this.personalError='';
    this.formCdr.markForCheck();
  }

  savePersonal():void {
    if(this.savingPersonal)return;
    if(this.personalForm.invalid){this.personalForm.markAllAsTouched();return;}
    const values=this.personalForm.getRawValue();
    const payload:PersonalInfo={
      firstName:(values.firstName||'').trim(),
      lastName:(values.lastName||'').trim(),
      documentNumber:(values.documentNumber||'').trim(),
      phone:(values.phone||'').trim()
    };
    this.savingPersonal=true;this.personalError='';this.personalSuccess='';
    this.http.put<StaffProfile>('/api/v1/profile/staff',payload,
      {headers:getMultiTenantHeaders()}).subscribe({
      next:updated=>{
        this.profile.set(updated);
        this.savingPersonal=false;
        this.editingPersonal=false;
        this.personalSuccess='Tus datos personales se actualizaron correctamente.';
        this.formCdr.markForCheck();
      },
      error:e=>{
        this.savingPersonal=false;
        const reason=e?.error?.detail||e?.error?.message;
        this.personalError=typeof reason==='string'&&reason.length<250
          ?reason
          :e?.status===409?'El DNI ya está registrado en otro legajo de personal.':'No se pudieron guardar los datos.';
        this.formCdr.markForCheck();
      }
    });
  }
  ngOnInit():void {
    this.http.get<StaffProfile>('/api/v1/profile/staff',
      {headers:getMultiTenantHeaders()}).subscribe({
      next:p=>{
        this.profile.set(p);
        this.loading=false;
        this.loadPortfolios();
        this.formCdr.markForCheck();
      },
      error:()=>{
        this.loading=false;
        this.error='No se pudo consultar tu perfil. Verificá que el legajo esté vinculado.';
        this.formCdr.markForCheck();
      }
    });
  }
  loadPortfolios(): void {
    this.http.get<any[]>(this.myPortfoliosUrl, { headers: getMultiTenantHeaders() })
      .subscribe({
        next: list => { this.portfolios.set(list); this.portfolioError = ''; this.formCdr.markForCheck(); },
        error: e => {
          this.portfolioError = e.status === 403
            ? 'Tu cuenta no tiene un legajo habilitado para gestionar portfolios.'
            : 'No se pudieron cargar tus portfolios.';
          this.formCdr.markForCheck();
        }
      });
  }
  startPortfolio(item?: any): void {
    if (!this.canManagePortfolio) return;
    this.portfolioEditId = item?.id || '';
    this.portfolio = item
      ? { title: item.title, category: item.category, description: item.description,
          activityDate: item.activityDate, mediaUrl: item.mediaUrl || '' }
      : { title: '', description: '', category: 'CURSO',
          activityDate: new Date().toISOString().slice(0, 10), mediaUrl: '' };
    this.portfolioError = '';
    this.showPortfolioForm = true;
  }
  savePortfolio(): void {
    if (this.portfolioBusy || !this.canManagePortfolio) return;
    const payload = {
      title: String(this.portfolio.title || '').trim(),
      description: String(this.portfolio.description || '').trim(),
      category: this.portfolio.category,
      activityDate: this.portfolio.activityDate,
      mediaUrl: String(this.portfolio.mediaUrl || '').trim()
    };
    if (!payload.title || !payload.description || !payload.activityDate) {
      this.portfolioError = 'Completá el título, la descripción y la fecha.';
      return;
    }
    this.portfolioBusy = true;
    this.portfolioError = '';
    const options = { headers: getMultiTenantHeaders() };
    const request = this.portfolioEditId
      ? this.http.put(`${this.myPortfoliosUrl}/${this.portfolioEditId}`, payload, options)
      : this.http.post(this.myPortfoliosUrl, payload, options);
    request.subscribe({
      next: () => {
        this.portfolioBusy = false;
        this.showPortfolioForm = false;
        this.loadPortfolios();
      },
      error: e => {
        this.portfolioBusy = false;
        this.portfolioError = e?.error?.detail || e?.error?.message ||
          (e.status === 403 ? 'No tenés permiso para modificar este portfolio.' : 'No se pudo guardar el portfolio.');
        this.formCdr.markForCheck();
      }
    });
  }
  async deletePortfolio(id: string): Promise<void> {
    if (!this.canManagePortfolio || !(await this.dialogs.confirm('¿Eliminar este portfolio?'))) return;
    this.http.delete(`${this.myPortfoliosUrl}/${id}`, { headers: getMultiTenantHeaders() })
      .subscribe({
        next: () => this.loadPortfolios(),
        error: e => {
          this.portfolioError = e.status === 403
            ? 'No tenés permiso para eliminar este portfolio.'
            : 'No se pudo eliminar el portfolio.';
          this.formCdr.markForCheck();
        }
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
