import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TenantService } from '../../services/tenant/tenant';

interface AuthResult { token:string; email:string; role:string; institutionId:string; }

@Component({
  selector:'app-login', standalone:true, imports:[FormsModule],
  templateUrl:'./login.html', styleUrl:'./login.css'
})
export class Login implements OnInit {
  institutions=signal<any[]>([]);
  institutionId=''; email=''; password=''; error=''; loading=false; institutionsLoading=true;
  showPassword=false; forgotOpen=false; forgotMessage=''; forgotBusy=false; resetToken=''; resetPassword=''; resetConfirm=''; resetMessage='';
  constructor(private router:Router, private route:ActivatedRoute, private http:HttpClient, private tenantService:TenantService) {}
  ngOnInit():void {
    this.resetToken=this.route.snapshot.queryParamMap.get('reset') || '';
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
        if(!data.token){this.error='El servidor no devolvió un token JWT.';return;}
        sessionStorage.setItem('educore_access_token',data.token);
        sessionStorage.setItem('current_user_email',data.email);
        sessionStorage.setItem('current_user_role',data.role);
        sessionStorage.setItem('current_institution_id',data.institutionId);
        const school=this.institutions().find(i=>i.id===data.institutionId);
        sessionStorage.setItem('current_institution_name',school?.name || 'Institución activa');
        this.password='';this.router.navigate([data.role==='TUTOR'?'/my-students':'/dashboard']);
      },
      error:(err)=>{this.loading=false;this.error=err.status===401?'Correo o contraseña incorrectos, o cuenta deshabilitada.':`No se pudo iniciar sesión (${err.status || 'sin conexión'}). Revisá el backend.`;}
    });
  }
  requestReset():void {
    if(!this.institutionId || !this.email.trim()){this.forgotMessage='Seleccioná institución e ingresá tu correo.';return;}
    this.forgotBusy=true;this.forgotMessage='';
    this.http.post('http://localhost:8080/api/v1/auth/forgot-password', {institutionId:this.institutionId,email:this.email.trim()}).subscribe({
      next:()=>{this.forgotBusy=false;this.forgotMessage='Si existe una cuenta, recibirás un enlace de recuperación en tu correo.';},
      error:()=>{this.forgotBusy=false;this.forgotMessage='No se pudo enviar la solicitud. Comprobá la conexión al backend.';}
    });
  }
  submitReset():void {
    if(!this.resetToken || this.resetPassword.length<12){this.resetMessage='Ingresá una contraseña de al menos 12 caracteres.';return;}
    if(this.resetPassword!==this.resetConfirm){this.resetMessage='Las contraseñas no coinciden.';return;}
    this.http.post('http://localhost:8080/api/v1/auth/reset-password',{token:this.resetToken,newPassword:this.resetPassword}).subscribe({
      next:()=>{this.resetToken='';this.resetPassword='';this.resetConfirm='';this.resetMessage='Contraseña cambiada. Ya podés iniciar sesión.';this.router.navigate(['/login']);},
      error:()=>this.resetMessage='El enlace venció, es inválido o la nueva contraseña no cumple los requisitos.'
    });
  }

}
