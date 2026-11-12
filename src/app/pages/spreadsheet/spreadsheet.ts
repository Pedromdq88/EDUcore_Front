import { Component, OnInit, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../services/student/student';
import { createXlsx, saveBlob } from '../../utils/xlsx-export';
import { Student } from '../../models/student';
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-spreadsheet',standalone:true,imports:[FormsModule,RouterLink],templateUrl:'./spreadsheet.html',styleUrl:'./spreadsheet.css'})
export class Spreadsheet implements OnInit {
 students=signal<Student[]>([]);search=signal('');classroom=signal('ALL');error='';
 classrooms=computed(()=>Array.from(new Set(this.students().map(s=>s.classroom).filter(Boolean))).sort());
 filtered=computed(()=>this.students().filter(s=>(this.classroom()==='ALL'||s.classroom===this.classroom()) &&
  [s.firstName,s.lastName,s.documentNumber,s.legajoNumber].some(v=>String(v||'').toLowerCase().includes(this.search().toLowerCase()))));
 constructor(private api:StudentService){}
 ngOnInit():void{this.api.getStudents().subscribe({next:items=>this.students.set(items),error:()=>this.error='No se pudo cargar la planilla.'});}
 private readonly headers = [
  'Legajo','Apellido del alumno','Nombre del alumno','DNI del alumno','Nacimiento','Ciclo lectivo',
  'Sala / sección','Turno','Nacionalidad','Provincia','Localidad','Calle','Número','Piso','Departamento',
  'Teléfono del alumno','Celular del alumno','CUIL del alumno',
  'Tutor 1 - Apellido','Tutor 1 - Nombre','Tutor 1 - Vínculo','Tutor 1 - DNI','Tutor 1 - Teléfono',
  'Tutor 1 - Email','Tutor 1 - Dirección',
  'Tutor 2 - Apellido','Tutor 2 - Nombre','Tutor 2 - Vínculo','Tutor 2 - DNI','Tutor 2 - Teléfono',
  'Tutor 2 - Email','Tutor 2 - Dirección'
 ];
 /** Tutor 1 representa el primero del vínculo recibido; sin un indicador persistido
  * Si el registro histórico no tiene `is_primary` guardado, se toma el primer
  * vínculo recibido hasta que un administrador confirme el principal. */
 private studentRow(s:Student):Array<string|number>{
  const sorted=[...(s.tutors||[])];
  if (s.primaryTutorId) sorted.sort((a,b) =>
    a.id===s.primaryTutorId?-1:b.id===s.primaryTutorId?1:0);
  const first=sorted[0]||{},second=sorted[1]||{};
  const rowTutor=(t:any):string[]=>[
    t.lastName||'',t.firstName||'',t.relationship||'',t.documentNumber||'',t.phone||'',t.email||'',t.direccion||''
  ];
  return [s.legajoNumber||'',s.lastName,s.firstName,s.documentNumber,s.birthDate,s.academicYear,
    s.classroom||'Sin asignar',s.studentShift||'',s.nationality||'',s.birthProvince||'',s.addressLocality||'',
    s.street||'',s.streetNumber||'',s.floor||'',s.apartment||'',
    (s as any).studentLandlinePhone||(s as any).contactPhone||'',(s as any).studentCellphone||'',s.cuil||'',
    ...rowTutor(first),...rowTutor(second)];
 }
 exportExcel():void {
  const selected=this.filtered();
  const rows=selected.map(s=>this.studentRow(s));
  const all=[{name:'Matrícula general',rows:[this.headers,...rows]}];
  const grouped=this.classrooms().map(room=>({name:room,rows:[this.headers,...selected.filter(s=>s.classroom===room).map(s=>this.studentRow(s))]}));
  saveBlob(createXlsx([...all,...grouped]),`educore-planilla-${new Date().getFullYear()}.xlsx`);
 }
 exportCsv():void {
  const rows=[this.headers,...this.filtered().map(s=>this.studentRow(s))];
  const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');a.href=url;a.download='educore-planilla-alumnos.csv';a.click();URL.revokeObjectURL(url);
 }

}
