import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { StudentService } from '../../../services/student/student';
import { Student } from '../../../models/student';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.css'
})
export class StudentDetail implements OnInit {
  student = signal<Student | null>(null);
  medicalRecord = signal<any>(null);
  pickups = signal<any[]>([]);
  restrictions = signal<any[]>([]);

  constructor(
    private route: ActivatedRoute,
    private studentService: StudentService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadStudentData(id);
    }
  }

  loadStudentData(id: string) {
    this.studentService.getStudentById(id).subscribe(data => this.student.set(data));
    this.studentService.getMedicalRecord(id).subscribe(data => this.medicalRecord.set(data));
    this.studentService.getAuthorizedPickups(id).subscribe(data => this.pickups.set(data));
    this.studentService.getJudicialRestrictions(id).subscribe(data => this.restrictions.set(data));
  }

  bajaStudent() {
    const s = this.student();
    if (s?.id && confirm("¿Dar de baja a este alumno?")) {
      this.studentService.bajaStudent(s.id).subscribe(() => {
        alert("Alumno dado de baja.");
      });
    }
  }
}