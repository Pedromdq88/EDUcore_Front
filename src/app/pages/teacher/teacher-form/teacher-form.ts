import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TeacherService } from '../../../services/teacher/teacher';
import { ShiftService } from '../../../services/shift/shift';

@Component({
  selector: 'app-teacher-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './teacher-form.html',
  styleUrl: './teacher-form.css'
})
export class TeacherForm implements OnInit {
  classrooms = signal<any[]>([]);
  get isDirector(): boolean { return sessionStorage.getItem('current_user_role') === 'DIRECTOR'; }

  firstName = '';
  lastName = '';
  documentNumber = '';
  email = '';
  password = '';
  role = 'TEACHER';
  phone = '';
  hireDate = '';
  classroom = '';

  constructor(
    private teacherService: TeacherService,
    private shiftService: ShiftService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.shiftService.getClassroomsConfig().subscribe(data => this.classrooms.set(data));
  }

  submitStaff() {
    if (!this.firstName || !this.lastName || !this.email) {
      alert("Por favor complete los campos obligatorios del personal.");
      return;
    }

    const payload = {
      firstName: this.firstName,
      lastName: this.lastName,
      documentNumber: this.documentNumber,
      email: this.email,
      password: this.password,
      role: this.role,
      phone: this.phone,
      hireDate: this.hireDate,
      classroom: this.classroom || null,
      status: 'ACTIVE',
      assignments: []
    };

    this.teacherService.createStaff(payload).subscribe({
      next: () => {
        alert("¡Personal registrado con éxito!");
        this.router.navigate(['/teachers']);
      },
      error: err => alert("Error al registrar personal: " + err.message)
    });
  }
}