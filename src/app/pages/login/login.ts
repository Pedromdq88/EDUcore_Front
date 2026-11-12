import { ValidateSubmitDirective } from '../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../utils/forms/field-validation.directive';
import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TenantService } from '../../services/tenant/tenant';
import { landingFor } from '../../guards/roles';

interface AuthResult { token:string; email:string; role:string; institutionId:string; requiresPasswordChange:boolean; }

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector:'app-login', standalone:true, imports: [FieldValidationDirective, ValidateSubmitDirective, FormsModule,RouterLink],
  templateUrl:'./login.html', styleUrl:'./login.css'
})
export class Login implements OnInit {
  institutions=signal<any[]>([]);
  institutionId=''; email=''; password=''; private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
   private readonly loadingState = signal(false);
  get loading(): boolean {return this.loadingState();}
  set loading(value: boolean) {this.loadingState.set(value);}
   institutionsLoading=true;
  showPassword=false;
  constructor(private router:Router, private http:HttpClient, private tenantService:TenantService) {}
  ngOnInit():void {
    this.tenantService.getPublicInstitutions().subscribe({
      next:(list)=>{
        this.institutions.set(list);
        this.institutionsLoading=false;
        if(list.length===1) this.institutionId=list[0].id;
      },error:(err)=>{
        this.institutionsLoading=false;
        const status = err?.status;
        if (status === 0) {
          this.error = 'No se pudo conectar con la API. Revisá si el backend está activo y si Angular tiene configurado el proxy.';
        } else if (status === 404 || status === 200) {
          this.error = 'Angular no recibió la respuesta JSON de instituciones. Revisá el proxy /api hacia el puerto 8080 y reiniciá ng serve.';
        } else if (status === 401 || status === 403) {
          this.error = 'La API rechazó el acceso al listado público de instituciones. Revisá la configuración de seguridad del backend.';
        } else if (status >= 500) {
          this.error = `El backend devolvió un error ${status} al consultar las instituciones. Revisá la consola de Spring Boot.`;
        } else {
          this.error = `No se pudieron cargar las instituciones (HTTP ${status ?? 'desconocido'}).`;
        }
      }
    });
  }
  handleLogin():void {if(this.loading)return;

    if(!this.institutionId || !this.email.trim() || !this.password){this.error='Completá institución, correo y contraseña.';return;}
    this.error='';this.loading=true;
    this.http.post<AuthResult>('/api/v1/auth/login',{
      institutionId:this.institutionId, email:this.email.trim(), password:this.password
    }).subscribe({
      next:(data)=>{
        this.loading=false;
        if(!data.token){this.error='El servidor no devolvió la sesión de acceso.';return;}
        sessionStorage.setItem('educore_access_token',data.token);
        sessionStorage.setItem('current_user_email',data.email);
        sessionStorage.setItem('current_user_role',data.role);
        sessionStorage.setItem('educore_requires_password_change',String(!!data.requiresPasswordChange));
        sessionStorage.setItem('current_institution_id',data.institutionId);
        const school=this.institutions().find(i=>i.id===data.institutionId);
        sessionStorage.setItem('current_institution_name',school?.name || 'Institución activa');
        this.password='';this.router.navigate([data.requiresPasswordChange?'/change-password':landingFor(data.role)]);
      },
      error:(err)=>{this.loading=false;this.error=err.status===401?'Correo, contraseña o institución incorrectos; o cuenta deshabilitada.':`No se pudo iniciar sesión (${err.status || 'sin conexión'}). Revisá el backend.`;}
    });
  }
}
