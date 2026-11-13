import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TenantService } from '../../services/tenant/tenant';
import { landingFor } from '../../guards/roles';
interface AuthResult {
  token: string;
  email: string;
  role: string;
  institutionId: string;
  requiresPasswordChange: boolean;
}
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  institutions = signal<any[]>([]);
  private readonly errorState = signal('');
  get error(): string {
    return this.errorState();
  }
  set error(value: string) {
    this.errorState.set(value);
  }
  private readonly loadingState = signal(false);
  get loading(): boolean {
    return this.loadingState();
  }
  set loading(value: boolean) {
    this.loadingState.set(value);
  }
  institutionsLoading = true;
  showPassword = false;
  loginForm: FormGroup;
  institutionId: FormControl;
  email: FormControl;
  password: FormControl;
  constructor(private router: Router, private http: HttpClient, private tenantService: TenantService) {
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
    this.password = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.loginForm = new FormGroup({
      institutionId: this.institutionId,
      email: this.email,
      password: this.password,
    });
  }
  ngOnInit(): void {
    this.tenantService.getPublicInstitutions().subscribe({
      next: (list) => {
        this.institutions.set(list);
        this.institutionsLoading = false;
        if (list.length === 1)
          this.institutionId.setValue(list[0].id);
      },
      error: (err) => {
        this.institutionsLoading = false;
        const status = err?.status;
        if (status === 0) {
          this.error = 'No se pudo conectar con la API. Revisá si el backend está activo y si Angular tiene configurado el proxy.';
        }
        else if (status === 404 || status === 200) {
          this.error = 'Angular no recibió la respuesta JSON de instituciones. Revisá el proxy /api hacia el puerto 8080 y reiniciá ng serve.';
        }
        else if (status === 401 || status === 403) {
          this.error = 'La API rechazó el acceso al listado público de instituciones. Revisá la configuración de seguridad del backend.';
        }
        else if (status >= 500) {
          this.error = `El backend devolvió un error ${status} al consultar las instituciones. Revisá la consola de Spring Boot.`;
        }
        else {
          this.error = `No se pudieron cargar las instituciones (HTTP ${status ?? 'desconocido'}).`;
        }
      }
    });
  }
  handleLogin(): void {
    if (this.loading || this.institutionsLoading)
      return;
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      this.error = 'Revisá los campos marcados del formulario.';
      return;
    }
    if (!this.institutionId.value || !this.email.value.trim() || !this.password.value) {
      this.error = 'Completá institución, correo y contraseña.';
      return;
    }
    this.error = '';
    this.loading = true;
    this.http.post<AuthResult>('/api/v1/auth/login', {
      institutionId: this.institutionId.value,
      email: this.email.value.trim(),
      password: this.password.value
    }).subscribe({
      next: async (data) => {
        if (!data.token) {
          this.loading = false;
          this.error = 'El servidor no devolvió la sesión de acceso.';
          return;
        }
        sessionStorage.setItem('educore_access_token', data.token);
        sessionStorage.setItem('current_user_email', data.email);
        sessionStorage.setItem('current_user_role', data.role);
        sessionStorage.setItem('educore_requires_password_change', String(!!data.requiresPasswordChange));
        sessionStorage.setItem('current_institution_id', data.institutionId);
        const school = this.institutions().find(i => i.id === data.institutionId);
        sessionStorage.setItem('current_institution_name', school?.name || 'Institución activa');
        try {
          if (!await this.router.navigate([data.requiresPasswordChange ? '/change-password' : landingFor(data.role)]))
            this.error = 'No se pudo abrir el inicio. Volvé a intentar.';
        } catch {
          this.error = 'No se pudo abrir el inicio. Volvé a intentar.';
        } finally {
          this.loading = false;
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.status === 401 ? 'Correo, contraseña o institución incorrectos; o cuenta deshabilitada.' : `No se pudo iniciar sesión (${err.status || 'sin conexión'}). Revisá el backend.`;
      }
    });
  }
}
