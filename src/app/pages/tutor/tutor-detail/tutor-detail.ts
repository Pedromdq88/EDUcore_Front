import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TutorService } from '../../../services/tutor/tutor';
import { Tutor } from '../../../models/tutor';

@Component({
  selector: 'app-tutor-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-detail.html',
  styleUrl: './tutor-detail.css'
})
export class TutorDetail implements OnInit {
  tutor = signal<Tutor | null>(null);

  constructor(private route: ActivatedRoute, private tutorService: TutorService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    // El servicio actual no expone getTutorById: reutilizamos su listado.
    this.tutorService.getTutors().subscribe({
      next: list => this.tutor.set(list.find(t => t.id === id) ?? null),
      error: err => console.error('Error al cargar tutor:', err)
    });
  }
}
