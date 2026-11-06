import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({ selector:'app-header', standalone:true, imports:[FormsModule], templateUrl:'./header.html', styleUrl:'./header.css' })
export class Header {
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
    this.http.post('http://localhost:8080/api/v1/auth/change-password',{
      currentPassword:this.oldPassword,newPassword:this.newPassword
    },{headers:{Authorization:`Bearer ${token}`,'X-Institution-Id':tenant}}).subscribe({
      next:()=>{this.saving=false;this.changingPassword=false;this.oldPassword='';this.newPassword='';this.repeatPassword='';this.logout();},
      error:()=>{this.saving=false;this.changeError='No se pudo cambiar la contraseña. Revisá la actual y los requisitos.';}
    });
  }
  logout(): void {
    const token = sessionStorage.getItem('educore_access_token');
    const tenant = sessionStorage.getItem('current_institution_id') || '';
    if (token) this.http.post('http://localhost:8080/api/v1/auth/logout', {}, {
      headers:{Authorization:`Bearer ${token}`, 'X-Institution-Id':tenant}
    }).subscribe({error:()=>{}});
    sessionStorage.removeItem('educore_access_token');
    sessionStorage.removeItem('current_user_email');
    sessionStorage.removeItem('current_user_role');
    sessionStorage.removeItem('current_institution_id');
    sessionStorage.removeItem('current_institution_name');
    this.router.navigate(['/login']);
  }
}
