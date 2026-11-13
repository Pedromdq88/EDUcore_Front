import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../services/student/student';
import { Student } from '../../models/student';
@Component({
  selector: 'app-year-promotion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterLink],
  templateUrl: './year-promotion.html',
  styleUrl: './year-promotion.css'
})
export class YearPromotion implements OnInit {
  readonly students = signal<Student[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor(private studentService: StudentService) { }
  get unassigned(): Student[] {
    return this.students().filter(student => !student.classroom && student.status === 'ACTIVE');
  }
  ngOnInit(): void {
    this.studentService.getStudents().subscribe({
      next: students => {
        this.students.set(students);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron consultar los alumnos.');
      }
    });
  }
}
