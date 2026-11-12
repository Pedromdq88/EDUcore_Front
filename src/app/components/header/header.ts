import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { ValidateSubmitDirective } from '../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../utils/forms/field-validation.directive';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager, selector:'app-header', standalone:true, imports: [FieldValidationDirective, ValidateSubmitDirective, FormsModule], templateUrl:'./header.html', styleUrl:'./header.css' })
export class Header {
  private readonly formCdr = inject(ChangeDetectorRef);

  private readonly dialogs=inject(UiDialogService);

  readonly canDiscardForm = canDiscardForm;
  changingPassword=false; oldPassword=''; newPassword=''; repeatPassword=''; changeError=''; saving=false;
  @Output() menuToggle = new EventEmitter<void>();
  constructor(private router: Router, private http: HttpClient) {}
  get email(): string { return sessionStorage.getItem('current_user_email') || 'Usuario'; }
  get institution(): string { return sessionStorage.getItem('current_institution_name') || 'Institución activa'; }
  get role(): string {
    const role=sessionStorage.getItem('current_user_role') || '';
    return ({DIRECTOR:'Dirección',ADMINISTRATIVE:'Administrativo',TEACHER:'Docente',TUTOR:'Tutor',PRECEPTOR:'Preceptor/a'} as Record<string,string>)[role] || role;
  }

  savePassword():void {
    this.changeError='';
    if(this.newPassword.length<12){this.changeError='La contraseña debe tener al menos 12 caracteres.';return;}
    if(this.newPassword!==this.repeatPassword){this.changeError='Las contraseñas no coinciden.';return;}
    const token=sessionStorage.getItem('educore_access_token')||'';
    const tenant=sessionStorage.getItem('current_institution_id')||'';
    this.saving=true;
    this.http.post('/api/v1/auth/change-password',{
      currentPassword:this.oldPassword,newPassword:this.newPassword
    },{headers:{Authorization:`Bearer ${token}`,'X-Institution-Id':tenant}}).subscribe({
      next:()=>{this.saving=false;this.changingPassword=false;this.oldPassword='';this.newPassword='';this.repeatPassword='';this.logout();},
      error:()=>{this.saving=false;this.changeError='No se pudo cambiar la contraseña. Revisá la actual y los requisitos.';}
    });
  }
  logout(): void {
    const token = sessionStorage.getItem('educore_access_token');
    const tenant = sessionStorage.getItem('current_institution_id') || '';
    if (token) this.http.post('/api/v1/auth/logout', {}, {
      headers:{Authorization:`Bearer ${token}`, 'X-Institution-Id':tenant}
    }).subscribe({error:()=>{}});
    sessionStorage.removeItem('educore_access_token');
    sessionStorage.removeItem('current_user_email');
    sessionStorage.removeItem('current_user_role');
    sessionStorage.removeItem('current_institution_id');
    sessionStorage.removeItem('current_institution_name');
    sessionStorage.removeItem('educore_requires_password_change');
    this.router.navigate(['/login']);
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
