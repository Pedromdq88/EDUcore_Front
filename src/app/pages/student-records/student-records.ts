import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudentService } from '../../services/student/student';
import { Student } from '../../models/student';

@Component({selector:'app-student-records',standalone:true,imports:[FormsModule,RouterLink],templateUrl:'./student-records.html',styleUrl:'./student-records.css'})
export class StudentRecords implements OnInit {
 students=signal<Student[]>([]);records=signal<any[]>([]);medical=signal<any|null>(null);
 selectedId='';error='';loading=false;
 mode:'medical'|'pickups'|'restrictions'='medical';
 constructor(private route:ActivatedRoute,private api:StudentService){}
 get title():string{return this.mode==='medical'?'Ficha Médica Escolar':this.mode==='pickups'?'Control de Retiros':'Restricciones Judiciales';}
 get icon():string{return this.mode==='medical'?'medical_services':this.mode==='pickups'?'how_to_reg':'gavel';}
 get description():string{return this.mode==='medical'?'Consulta de información de salud asociada al legajo del alumno':this.mode==='pickups'?'Personas autorizadas a retirar alumnos del establecimiento':'Medidas judiciales registradas en el legajo escolar';}
 ngOnInit():void{
  this.mode=(this.route.snapshot.data['mode'] || 'medical') as 'medical'|'pickups'|'restrictions';
  this.api.getStudents().subscribe({next:items=>this.students.set(items),error:()=>this.error='No se pudieron cargar los alumnos.'});
 }
 load():void{
  this.error='';this.records.set([]);this.medical.set(null);
  if(!this.selectedId)return;
  this.loading=true;
  const source=this.mode==='medical'?this.api.getMedicalRecord(this.selectedId):this.mode==='pickups'?this.api.getAuthorizedPickups(this.selectedId):this.api.getJudicialRestrictions(this.selectedId);
  source.subscribe({next:result=>{this.loading=false;if(this.mode==='medical')this.medical.set(result);else this.records.set(result || []);},error:()=>{this.loading=false;this.error='No se pudieron consultar los registros de este alumno.';}});
 }
}
