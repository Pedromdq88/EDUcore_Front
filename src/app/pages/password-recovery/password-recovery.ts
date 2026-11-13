import { matchingPasswords } from '../../validators/form.validator';
import { Component, OnInit, effect, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { TenantService } from '../../services/tenant/tenant';
interface SchoolOption {
  id: string;
  name: string;
  educationLevel?: string;
}
interface ResponseMessage {
  message: string;
}
interface VerifyResponse {
  valid: boolean;
  message: string;
}
type Stage = 'request' | 'verify' | 'new-password' | 'complete';
@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrl: './password-recovery.css'
})
export class PasswordRecovery implements OnInit {
  institutions = signal<SchoolOption[]>([]);
  stage = signal<Stage>('request');
  busy = signal(false);
  institutionLoading = signal(true);
  message = signal('');
  error = signal('');
  showPassword = false;
  private readonly url = '/api/v1/auth';
  requestForm: FormGroup;
  verifyForm: FormGroup;
  resetForm: FormGroup;
  institutionId: FormControl;
  email: FormControl;
  code: FormControl;
  nextPassword: FormControl;
  repeatPassword: FormControl;
  constructor(private http: HttpClient, private schools: TenantService) {
    this.institutionId = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.email = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        Validators.maxLength(30)
      ]
    });
    this.code = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{6}$/)]
    });
    this.nextPassword = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(72)]
    });
    this.repeatPassword = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.requestForm = new FormGroup({
      institutionId: this.institutionId,
      email: this.email
    });
    this.verifyForm = new FormGroup({
      code: this.code
    });
    this.resetForm = new FormGroup({
      nextPassword: this.nextPassword,
      repeatPassword: this.repeatPassword
    }, {
      validators: [matchingPasswords('nextPassword', 'repeatPassword')]
    });
    effect(() => {
      const busy = this.busy();
      for (const control of [this.email, this.code, this.nextPassword, this.repeatPassword]) {
        if (busy && control.enabled)
          control.disable({ emitEvent: false });
        else if (!busy && control.disabled)
          control.enable({ emitEvent: false });
      }
      const disabled = busy || this.institutionLoading();
      if (disabled && this.institutionId.enabled)
        this.institutionId.disable({ emitEvent: false });
      else if (!disabled && this.institutionId.disabled)
        this.institutionId.enable({ emitEvent: false });
    });
  }
  ngOnInit(): void {
    this.schools.getPublicInstitutions().subscribe({
      next: (schools: SchoolOption[]) => {
        this.institutions.set(schools);
        this.institutionLoading.set(false);
        if (schools.length === 1)
          this.institutionId.setValue(schools[0].id);
      },
      error: () => {
        this.institutionLoading.set(false);
        this.error.set('No se pudieron cargar las instituciones.');
      }
    });
  }
  requestCode(): void {
    this.requestForm.markAllAsTouched();
    if (this.requestForm.invalid) {
      this.error.set('Corregí los campos del formulario.');
      return;
    }
    if (this.busy())
      return;
    if (!this.institutionId.value || !this.email.value.trim()) {
      this.error.set('Seleccioná una institución e ingresá tu correo.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http.post<ResponseMessage>(`${this.url}/forgot-password`, {
      institutionId: this.institutionId.value,
      email: this.email.value.trim()
    }).subscribe({
      next: (response) => {
        this.busy.set(false);
        this.code.setValue('');
        this.message.set(response.message);
        this.stage.set('verify');
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e.status === 503
          ? 'El envío por Gmail no está disponible en este momento.'
          : 'No se pudo solicitar el código. Intentá nuevamente.');
      }
    });
  }
  verifyCode(): void {
    this.verifyForm.markAllAsTouched();
    if (this.verifyForm.invalid) {
      this.error.set('Corregí los campos del formulario.');
      return;
    }
    if (this.busy())
      return;
    if (!/^[0-9]{6}$/.test(this.code.value.trim())) {
      this.error.set('Ingresá el código de 6 dígitos.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http.post<VerifyResponse>(`${this.url}/verify-reset-code`, {
      institutionId: this.institutionId.value,
      email: this.email.value.trim(),
      code: this.code.value.trim()
    }).subscribe({
      next: (response) => {
        this.busy.set(false);
        if (response.valid) {
          this.stage.set('new-password');
          this.message.set(response.message);
        }
        else {
          this.error.set(response.message);
        }
      },
      error: () => {
        this.busy.set(false);
        this.error.set('No se pudo verificar el código. Intentá nuevamente.');
      }
    });
  }
  confirmCode(): void {
    this.resetForm.markAllAsTouched();
    if (this.resetForm.invalid) {
      this.error.set('Corregí los campos del formulario.');
      return;
    }
    if (this.busy())
      return;
    if (this.stage() !== 'new-password')
      return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http.post<ResponseMessage>(`${this.url}/reset-password`, {
      institutionId: this.institutionId.value,
      email: this.email.value.trim(),
      code: this.code.value.trim(),
      newPassword: this.nextPassword.value
    }).subscribe({
      next: (response) => {
        this.busy.set(false);
        if (response.message.startsWith('Contraseña actualizada')) {
          this.stage.set('complete');
          this.code.setValue('');
          this.nextPassword.setValue('');
          this.repeatPassword.setValue('');
          this.message.set(response.message);
        }
        else {
          this.error.set(response.message);
          if (response.message.toLowerCase().includes('código'))
            this.stage.set('verify');
        }
      },
      error: () => {
        this.busy.set(false);
        this.stage.set('verify');
        this.error.set('El código es inválido o venció. Solicitá uno nuevo si es necesario.');
      }
    });
  }
  restart(): void {
    this.stage.set('request');
    this.verifyForm.reset();
    this.resetForm.reset();
    this.error.set('');
    this.message.set('');
  }
}
