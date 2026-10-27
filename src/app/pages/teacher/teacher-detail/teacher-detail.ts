import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Teacher } from '../../../models/teacher';
import { TeacherService } from '../../../services/teacher/teacher';
import { PortfolioService } from '../../../services/portfolios/portfolios';

@Component({
  selector: 'app-teacher-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './teacher-detail.html',
  styleUrl: './teacher-detail.css'
})
export class TeacherDetail implements OnInit {
  teacher = signal<Teacher | null>(null);
  portfolios = signal<any[]>([]);

  constructor(
    private route: ActivatedRoute,
    private teacherService: TeacherService,
    private portfolioService: PortfolioService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTeacherData(id);
    }
  }

  loadTeacherData(id: string) {
    this.teacherService.getStaff().subscribe(list => {
      const found = list.find(t => t.id === id);
      if (found) this.teacher.set(found);
    });
    this.portfolioService.getPortfoliosByStaff(id).subscribe(data => this.portfolios.set(data));
  }

  bajaTeacher() {
    const t = this.teacher();
    if (t?.id && confirm("¿Dar de baja a este miembro del personal?")) {
      this.teacherService.bajaStaff(t.id).subscribe(() => {
        alert("Personal dado de baja correctamente.");
      });
    }
  }
}