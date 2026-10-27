import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../services/student/student';
import { Student } from '../../models/student';
@Component({selector:'app-spreadsheet',standalone:true,imports:[FormsModule,RouterLink],templateUrl:'./spreadsheet.html',styleUrl:'./spreadsheet.css'})
export class Spreadsheet implements OnInit {
 students=signal<Student[]>([]);search=signal('');classroom=signal('ALL');error='';
 classrooms=computed(()=>Array.from(new Set(this.students().map(s=>s.classroom).filter(Boolean))).sort());
 filtered=computed(()=>this.students().filter(s=>(this.classroom()==='ALL'||s.classroom===this.classroom()) &&
  [s.firstName,s.lastName,s.documentNumber,s.legajoNumber].some(v=>String(v||'').toLowerCase().includes(this.search().toLowerCase()))));
 constructor(private api:StudentService){}
 ngOnInit():void{this.api.getStudents().subscribe({next:items=>this.students.set(items),error:()=>this.error='No se pudo cargar la planilla.'});}
 exportCsv():void{
  const rows=[['N° Legajo','Apellido','Nombre','DNI','Fecha Nac.','Sección / Aula'],...this.filtered().map(s=>[s.legajoNumber||'',s.lastName,s.firstName,s.documentNumber,s.birthDate,s.classroom])];
  const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');a.href=url;a.download='educore-planilla-alumnos.csv';a.click();URL.revokeObjectURL(url);
 }
}
