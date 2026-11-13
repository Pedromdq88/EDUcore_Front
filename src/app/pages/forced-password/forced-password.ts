import { matchingPasswords, differentPassword } from '../../validators/form.validator';
import { signal, Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { getMultiTenantHeaders } from '../../services/tenant/tenant';
@Component({
  selector: 'app-forced-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './forced-password.html',
  styleUrl: './forced-password.css'
})
export class ForcedPassword {
  private readonly busyState = signal(false);
  get busy(): boolean {
    return this.busyState();
  }
  set busy(value: boolean) {
    this.busyState.set(value);
  }
  private readonly errorState = signal('');
  get error(): string {
    return this.errorState();
  }
  set error(value: string) {
    this.errorState.set(value);
  }
  passwordForm: FormGroup;
  current: FormControl;
  next: FormControl;
  confirm: FormControl;
  constructor(private http: HttpClient, private router: Router) {
    this.current = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.next = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(72)]
    });
    this.confirm = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.passwordForm = new FormGroup({
      current: this.current,
      next: this.next,
      confirm: this.confirm,
    }, {
      validators: [matchingPasswords('next', 'confirm'), differentPassword('current', 'next')]
    });
  }
  save(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      this.error = 'Revisá los campos marcados del formulario.';
      return;
    }
    if (this.busy)
      return;
    this.busy = true;
    this.error = '';
    this.http.post('/api/v1/auth/change-password', {
      currentPassword: this.current.value,
      newPassword: this.next.value
    }, {
      headers: getMultiTenantHeaders()
    }).subscribe({
      next: () => {
        this.busy = false;
        for (const key of [
          'educore_access_token',
          'current_user_email',
          'current_user_role',
          'current_institution_id',
          'current_institution_name',
          'educore_requires_password_change'
        ])
          sessionStorage.removeItem(key);
        this.router.navigate(['/login']);
      },
      error: e => {
        this.busy = false;
        this.error = e.status === 401 ? 'La contraseña inicial es incorrecta.' : `No se pudo cambiar la contraseña (HTTP ${e.status || 'sin conexión'}).`;
      }
    });
  }
}
