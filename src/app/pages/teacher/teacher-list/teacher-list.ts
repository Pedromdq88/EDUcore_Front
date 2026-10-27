import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TeacherService } from '../../../services/teacher/teacher';
import { Teacher } from '../../../models/teacher';


@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './teacher-list.html',
  styleUrl: './teacher-list.css'
})
export class TeacherList implements OnInit {
  staffList = signal<Teacher[]>([]);

  constructor(private teacherService: TeacherService) {}

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff() {
    this.teacherService.getStaff().subscribe(data => this.staffList.set(data));
  }
}