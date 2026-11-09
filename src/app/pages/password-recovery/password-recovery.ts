import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { TenantService } from '../../services/tenant/tenant';

interface SchoolOption { id: string; name: string; educationLevel?: string; }
interface ResponseMessage { message: string; }
interface VerifyResponse { valid: boolean; message: string; }
type Stage = 'request' | 'verify' | 'new-password' | 'complete';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrl: './password-recovery.css'
})
export class PasswordRecovery implements OnInit {
  institutions = signal<SchoolOption[]>([]);
  institutionId = '';
  email = '';
  code = '';
  nextPassword = '';
  repeatPassword = '';
  stage = signal<Stage>('request');
  busy = signal(false);
  institutionLoading = signal(true);
  message = signal('');
  error = signal('');
  showPassword = false;
  private readonly url = 'http://localhost:8080/api/v1/auth';

  constructor(private http: HttpClient, private schools: TenantService) {}

  ngOnInit(): void {
    this.schools.getPublicInstitutions().subscribe({
      next: (schools: SchoolOption[]) => {
        this.institutions.set(schools);
        this.institutionLoading.set(false);
        if (schools.length === 1) this.institutionId = schools[0].id;
      },
      error: () => {
        this.institutionLoading.set(false);
        this.error.set('No se pudieron cargar las instituciones.');
      }
    });
  }

  requestCode(): void {
    if (!this.institutionId || !this.email.trim()) {
      this.error.set('Seleccioná una institución e ingresá tu correo.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http.post<ResponseMessage>(`${this.url}/forgot-password`, {
      institutionId: this.institutionId,
      email: this.email.trim()
    }).subscribe({
      next: (response) => {
        this.busy.set(false);
        this.code = '';
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
    if (!/^[0-9]{6}$/.test(this.code.trim())) {
      this.error.set('Ingresá el código de 6 dígitos.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http.post<VerifyResponse>(`${this.url}/verify-reset-code`, {
      institutionId: this.institutionId,
      email: this.email.trim(),
      code: this.code.trim()
    }).subscribe({
      next: (response) => {
        this.busy.set(false);
        if (response.valid) {
          this.stage.set('new-password');
          this.message.set(response.message);
        } else {
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
    if (this.stage() !== 'new-password') return;
    if (this.nextPassword.length < 12 || this.nextPassword.length > 72) {
      this.error.set('Usá una contraseña de 12 a 72 caracteres.');
      return;
    }
    if (this.nextPassword !== this.repeatPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.http.post<ResponseMessage>(`${this.url}/reset-password`, {
      institutionId: this.institutionId,
      email: this.email.trim(),
      code: this.code.trim(),
      newPassword: this.nextPassword
    }).subscribe({
      next: (response) => {
        this.busy.set(false);
        if (response.message.startsWith('Contraseña actualizada')) {
          this.stage.set('complete');
          this.code = '';
          this.nextPassword = '';
          this.repeatPassword = '';
          this.message.set(response.message);
        } else {
          this.error.set(response.message);
          if (response.message.toLowerCase().includes('código')) this.stage.set('verify');
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
    this.code = '';
    this.nextPassword = '';
    this.repeatPassword = '';
    this.error.set('');
    this.message.set('');
  }
}
