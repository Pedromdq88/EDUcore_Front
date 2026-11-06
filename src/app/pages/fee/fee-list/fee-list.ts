import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../services/student/student';

@Component({
  selector: 'app-fee-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fee-list.html',
  styleUrl: './fee-list.css'
})
export class FeeList implements OnInit {
  students = signal<any[]>([]);
  selectedStudentId = '';
  academicYear = 2026;
  fees = signal<any[]>([]);

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.studentService.getStudents().subscribe(data => this.students.set(data));
  }

  onStudentChange() {
    if (this.selectedStudentId) {
      this.studentService.getStudentFees(this.selectedStudentId, this.academicYear).subscribe(data => {
        this.fees.set(data);
      });
    }
  }

  toggleFee(monthNumber: number) {
    if (!this.selectedStudentId) return;
    this.studentService.toggleStudentFee(this.selectedStudentId, this.academicYear, monthNumber).subscribe(() => {
      this.onStudentChange();
    });
  }
}