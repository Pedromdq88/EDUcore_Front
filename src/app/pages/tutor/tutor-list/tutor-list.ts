import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TutorService } from '../../../services/tutor/tutor';
import { Tutor } from '../../../models/tutor';

@Component({
  selector: 'app-tutor-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tutor-list.html',
  styleUrl: './tutor-list.css'
})
export class TutorList implements OnInit {
  tutors = signal<Tutor[]>([]);

  constructor(private tutorService: TutorService) {}

  ngOnInit(): void {
    this.loadTutors();
  }

  loadTutors() {
    this.tutorService.getTutors().subscribe(data => this.tutors.set(data));
  }
}