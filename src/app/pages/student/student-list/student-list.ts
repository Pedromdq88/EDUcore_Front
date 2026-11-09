import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentForm } from '../student-form/student-form';
import { RouterModule } from '@angular/router';
import { StudentService } from '../../../services/student/student';
import { TenantService } from '../../../services/tenant/tenant';
import { Student } from '../../../models/student';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StudentForm],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css'
})
export class StudentList implements OnInit {
  students = signal<Student[]>([]);
  query=''; classroom='ALL'; academicYear='ALL'; modalOpen=false; modalStudentId='';
  error='';message='';
  get canManage():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
  get classrooms():string[]{return [...new Set(this.students().map(s=>s.classroom).filter(Boolean))].sort();}
  get academicYears():number[]{return [...new Set(this.students().map(s=>s.academicYear).filter(Boolean))].sort((a,b)=>b-a);}
  get filteredStudents():Student[]{const q=this.query.trim().toLocaleLowerCase('es');return this.students().filter(s=>
    (this.classroom==='ALL'||s.classroom===this.classroom) && (this.academicYear==='ALL'||String(s.academicYear)===this.academicYear) &&
    (!q||[s.firstName,s.lastName,s.documentNumber,s.legajoNumber].join(' ').toLocaleLowerCase('es').includes(q)) );}
  openStudentModal(id=''):void{this.modalStudentId=id;this.modalOpen=true;this.error='';}
  onSaved(id:string):void{this.modalOpen=false;this.loadStudents();this.message='La matrícula se guardó. Podés abrir la ficha desde el listado.';}

  constructor(private studentService: StudentService,private school:TenantService) {}

  ngOnInit(): void {
    this.school.getProfile().subscribe({next:res=>this.academicYear=String((res.profile||res).academicYear||'ALL')});
    this.loadStudents();
  }

  loadStudents() {
    this.studentService.getStudents().subscribe({next:data=>this.students.set(data),error:()=>this.error="No se pudieron cargar los alumnos."});
  }
}