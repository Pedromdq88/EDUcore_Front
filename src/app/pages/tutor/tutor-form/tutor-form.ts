import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TutorService } from '../../../services/tutor/tutor';

@Component({
  selector: 'app-tutor-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tutor-form.html',
  styleUrl: './tutor-form.css'
})
export class TutorForm {
  firstName = '';
  lastName = '';
  documentNumber = '';
  relationship = 'MADRE';
  phone = '';
  email = '';
  profesion = '';
  condicionActividad = 'EMPLEADO';
  convive = 'SI';
  direccion = '';

  constructor(
    private tutorService: TutorService,
    private router: Router
  ) {}

  submitTutor() {
    if (!this.firstName || !this.lastName || !this.documentNumber) {
      alert("Por favor complete los campos obligatorios del tutor.");
      return;
    }

    const payload = {
      firstName: this.firstName,
      lastName: this.lastName,
      documentNumber: this.documentNumber,
      relationship: this.relationship,
      phone: this.phone,
      email: this.email,
      nacionalidad: 'Argentina',
      profesion: this.profesion,
      condicionActividad: this.condicionActividad,
      convive: this.convive,
      direccion: this.direccion
    };

    this.tutorService.createTutor(payload).subscribe({
      next: () => {
        alert("¡Tutor registrado con éxito!");
        this.router.navigate(['/tutors']);
      },
      error: err => alert("Error al registrar tutor: " + err.message)
    });
  }
}