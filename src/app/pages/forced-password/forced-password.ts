import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { getMultiTenantHeaders } from '../../services/tenant/tenant';
@Component({selector:'app-forced-password',standalone:true,imports:[FormsModule],templateUrl:'./forced-password.html',styleUrl:'./forced-password.css'})
export class ForcedPassword {
 current=''; next=''; confirm=''; busy=false; error='';
 constructor(private http:HttpClient, private router:Router){}
 save():void {
  if(this.next.length<12||this.next.length>72){this.error='La nueva contraseña debe tener de 12 a 72 caracteres.';return;}
  if(this.next!==this.confirm){this.error='Las contraseñas nuevas no coinciden.';return;}
  if(this.current===this.next){this.error='Elegí una contraseña distinta a la inicial.';return;}
  this.busy=true;this.error='';
  this.http.post('http://localhost:8080/api/v1/auth/change-password',{
   currentPassword:this.current,newPassword:this.next
  },{headers:getMultiTenantHeaders()}).subscribe({
   next:()=>{this.busy=false;for(const key of ['educore_access_token','current_user_email','current_user_role','current_institution_id','current_institution_name','educore_requires_password_change'])sessionStorage.removeItem(key);
     this.router.navigate(['/login']);},
   error:e=>{this.busy=false;this.error=e.status===401?'La contraseña inicial es incorrecta.':`No se pudo cambiar la contraseña (HTTP ${e.status||'sin conexión'}).`;}
  });
 }
}
