import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TenantService } from '../../services/tenant/tenant';
import { landingFor } from '../../guards/roles';

interface AuthResult { token:string; email:string; role:string; institutionId:string; requiresPasswordChange:boolean; }

@Component({
  selector:'app-login', standalone:true, imports:[FormsModule,RouterLink],
  templateUrl:'./login.html', styleUrl:'./login.css'
})
export class Login implements OnInit {
  institutions=signal<any[]>([]);
  institutionId=''; email=''; password=''; error=''; loading=false; institutionsLoading=true;
  showPassword=false;
  constructor(private router:Router, private http:HttpClient, private tenantService:TenantService) {}
  ngOnInit():void {
    this.tenantService.getPublicInstitutions().subscribe({
      next:(list)=>{
        this.institutions.set(list);
        this.institutionsLoading=false;
        if(list.length===1) this.institutionId=list[0].id;
      },error:()=>{this.institutionsLoading=false;this.error='No se pudieron cargar las instituciones. Verificá que Spring Boot esté ejecutándose en el puerto 8080.';}
    });
  }
  handleLogin():void {
    if(!this.institutionId || !this.email.trim() || !this.password){this.error='Completá institución, correo y contraseña.';return;}
    this.error='';this.loading=true;
    this.http.post<AuthResult>('http://localhost:8080/api/v1/auth/login',{
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
