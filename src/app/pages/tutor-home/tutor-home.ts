import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getMultiTenantHeaders } from '../../services/tenant/tenant';
@Component({selector:'app-tutor-home',standalone:true,templateUrl:'./tutor-home.html',styleUrl:'./tutor-home.css'})
export class TutorHome implements OnInit {
 students=signal<any[]>([]); error=''; loading=true;
 constructor(private http:HttpClient){}
 ngOnInit():void{
  this.http.get<any[]>('http://localhost:8080/api/v1/auth/my-students',{headers:getMultiTenantHeaders()}).subscribe({
   next:items=>{this.students.set(items);this.loading=false;},
   error:()=>{this.error='No se pudo consultar el listado de estudiantes vinculados a tu cuenta.';this.loading=false;}
  });
 }
}
