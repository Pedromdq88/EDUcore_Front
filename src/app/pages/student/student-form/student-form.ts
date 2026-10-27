import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StudentService } from '../../../services/student/student';
import { TutorService } from '../../../services/tutor/tutor';
import { ShiftService } from '../../../services/shift/shift';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-form.html',
  styleUrl: './student-form.css'
})
export class StudentForm implements OnInit {
  tutors = signal<any[]>([]);
  classrooms = signal<any[]>([]);

  firstName = '';
  lastName = '';
  documentNumber = '';
  legajoNumber = '';
  birthDate = '';
  classroom = '';
  tutorId = '';

  constructor(
    private studentService: StudentService,
    private tutorService: TutorService,
    private shiftService: ShiftService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tutorService.getTutors().subscribe(data => this.tutors.set(data));
    this.shiftService.getClassroomsConfig().subscribe(data => this.classrooms.set(data));
  }

  submitStudent() {
    if (!this.firstName || !this.lastName || !this.documentNumber || !this.birthDate) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }

    const payload: any = {
      firstName: this.firstName,
      lastName: this.lastName,
      documentNumber: this.documentNumber,
      legajoNumber: this.legajoNumber,
      birthDate: this.birthDate,
      classroom: this.classroom,
      academicYear: 2026,
      status: 'ACTIVE',
      cuil: '',
      dniStatus: 'FISICO',
      genderIdentity: 'NO_RESPONDE',
      birthCountry: 'ARGENTINA',
      nationality: 'Argentina',
      birthProvince: 'Buenos Aires',
      birthLocality: '',
      street: '',
      streetNumber: '',
      floor: '',
      tower: '',
      apartment: '',
      betweenStreets: '',
      addressLocality: '',
      hasSiblings: false,
      siblingCount: 0,
      siblingsInThisSchool: 0,
      receivesAuh: false,
      belongsToNativePeople: false,
      transportationMethods: 'A_PIE',
      tutorIds: this.tutorId ? [this.tutorId] : []
    };

    this.studentService.createStudent(payload).subscribe({
      next: () => {
        alert("¡Matrícula aprobada con éxito!");
        this.router.navigate(['/students']);
      },
      error: err => alert("Error al registrar alumno: " + err.message)
    });
  }
}