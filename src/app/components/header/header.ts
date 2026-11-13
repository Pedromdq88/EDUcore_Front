import { ChangeDetectorRef } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { Component, EventEmitter, Output } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  private readonly formCdr = inject(ChangeDetectorRef);
  private readonly dialogs = inject(UiDialogService);
  readonly canDiscardForm = canDiscardForm;
  changingPassword = false;
  changeError = '';
  saving = false;
  @Output()
  menuToggle = new EventEmitter<void>();
  passwordForm: FormGroup;
  oldPassword: FormControl;
  newPassword: FormControl;
  repeatPassword: FormControl;
  constructor(private router: Router, private http: HttpClient) {
    this.oldPassword = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.newPassword = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(72)]
    });
    this.repeatPassword = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.passwordForm = new FormGroup({
      oldPassword: this.oldPassword,
      newPassword: this.newPassword,
      repeatPassword: this.repeatPassword
    });
  }
  get email(): string {
    return sessionStorage.getItem('current_user_email') || 'Usuario';
  }
  get institution(): string {
    return sessionStorage.getItem('current_institution_name') || 'Institución activa';
  }
  get role(): string {
    const role = sessionStorage.getItem('current_user_role') || '';
    return ({
      DIRECTOR: 'Dirección',
      ADMINISTRATIVE: 'Administrativo',
      TEACHER: 'Docente',
      TUTOR: 'Tutor',
      PRECEPTOR: 'Preceptor/a'
    } as Record<string, string>)[role] || role;
  }
  savePassword(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      this.changeError = "Corregí los campos marcados.";
      return;
    }
    this.changeError = '';
    if (this.newPassword.value.length < 12) {
      this.changeError = 'La contraseña debe tener al menos 12 caracteres.';
      return;
    }
    if (this.newPassword.value !== this.repeatPassword.value) {
      this.changeError = 'Las contraseñas no coinciden.';
      return;
    }
    const token = sessionStorage.getItem('educore_access_token') || '';
    const tenant = sessionStorage.getItem('current_institution_id') || '';
    this.saving = true;
    this.http.post('/api/v1/auth/change-password', {
      currentPassword: this.oldPassword.value,
      newPassword: this.newPassword.value
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Institution-Id': tenant
      }
    }).subscribe({
      next: () => {
        this.saving = false;
        this.changingPassword = false;
        this.oldPassword.setValue('');
        this.newPassword.setValue('');
        this.repeatPassword.setValue('');
        this.logout();
      },
      error: () => {
        this.saving = false;
        this.changeError = 'No se pudo cambiar la contraseña. Revisá la actual y los requisitos.';
      }
    });
  }
  logout(): void {
    const token = sessionStorage.getItem('educore_access_token');
    const tenant = sessionStorage.getItem('current_institution_id') || '';
    if (token)
      this.http.post('/api/v1/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Institution-Id': tenant
        }
      }).subscribe({
        error: () => { }
      });
    sessionStorage.removeItem('educore_access_token');
    sessionStorage.removeItem('current_user_email');
    sessionStorage.removeItem('current_user_role');
    sessionStorage.removeItem('current_institution_id');
    sessionStorage.removeItem('current_institution_name');
    sessionStorage.removeItem('educore_requires_password_change');
    this.router.navigate(['/login']);
  }
  async confirmDiscard(form: {
    dirty?: boolean | null;
  } | null | undefined, target: string): Promise<void> {
    if (form?.dirty && !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios')))
      return;
    this.formCdr.markForCheck();
    if (target === 'dismissed') {
      (this as any).dismissed?.emit();
    }
    else {
      (this as any)[target] = false;
      this.formCdr.markForCheck();
    }
  }
}
