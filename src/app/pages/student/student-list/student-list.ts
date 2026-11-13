import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentForm } from '../student-form/student-form';
import { ClassroomAssignment } from '../../../components/classroom-assignment/classroom-assignment';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { StudentService } from '../../../services/student/student';
import { TenantService } from '../../../services/tenant/tenant';
import { Student } from '../../../models/student';
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StudentForm, ClassroomAssignment],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css'
})
export class StudentList implements OnInit {
  students = signal<Student[]>([]);
  query = '';
  classroom = 'ALL';
  academicYear = 'ALL';
  modalOpen = false;
  modalStudentId = '';
  onlyUnassigned = false;
  assigning: Student | null = null;
  deletingId = '';
  error = '';
  message = '';
  get canManage(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  get classrooms(): string[] {
    return [...new Set(this.students().map(s => s.classroom).filter(Boolean))].sort();
  }
  get academicYears(): number[] {
    return [...new Set(this.students().map(s => s.academicYear).filter(Boolean))].sort((a, b) => b - a);
  }
  get filteredStudents(): Student[] {
    const q = this.query.trim().toLocaleLowerCase('es');
    return this.students().filter(s => (this.classroom === 'ALL' || s.classroom === this.classroom) && (!this.onlyUnassigned || !s.classroom) && (this.academicYear === 'ALL' || String(s.academicYear) === this.academicYear) &&
      (!q || [s.firstName, s.lastName, s.documentNumber, s.legajoNumber].join(' ').toLocaleLowerCase('es').includes(q)));
  }
  openStudentModal(id = ''): void {
    this.modalStudentId = id;
    this.modalOpen = true;
    this.error = '';
  }
  onSaved(id: string): void {
    this.modalOpen = false;
    this.loadStudents();
    this.message = 'La matrícula se guardó. Podés abrir la ficha desde el listado.';
  }
  constructor(private studentService: StudentService, private school: TenantService, private dialogs: UiDialogService, private route: ActivatedRoute) { }
  ngOnInit(): void {
    this.academicYear = 'ALL';
    this.onlyUnassigned = this.route.snapshot.queryParamMap.get('sinAsignar') === '1';
    this.loadStudents();
  }
  onAssigned(): void {
    this.assigning = null;
    this.message = 'Aula asignada correctamente.';
    this.loadStudents();
  }
  async deleteStudent(student: Student): Promise<void> {
    if (!this.canManage || !student.id || this.deletingId)
      return;
    const accepted = await this.dialogs.confirm(`¿Querés eliminar a ${student.firstName} ${student.lastName} de la institución? La operación dará de baja su matrícula y sus registros asociados.`, 'Eliminar alumno', true, 'Sí, eliminar');
    if (!accepted)
      return;
    this.deletingId = student.id;
    this.studentService.bajaStudent(student.id).subscribe({
      next: () => {
        this.deletingId = '';
        this.message = 'El alumno fue dado de baja.';
        this.loadStudents();
      },
      error: e => {
        this.deletingId = '';
        this.error = e?.error?.detail || 'No se pudo dar de baja al alumno.';
      }
    });
  }
  loadStudents() {
    this.studentService.getStudents().subscribe({
      next: data => this.students.set(data),
      error: () => this.error = "No se pudieron cargar los alumnos."
    });
  }
}
