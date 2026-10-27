import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnnouncementService } from '../../services/announcements/announcements';
import { SubjectService } from '../../services/subjects/subjects';
import { TeacherService } from '../../services/teacher/teacher';
import { TutorService } from '../../services/tutor/tutor';
import { StudentService } from '../../services/student/student';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  totalStudents = signal(0);
  totalTutors = signal(0);
  totalStaff = signal(0);
  totalSubjects = signal(0);
  announcements = signal<any[]>([]);

  constructor(
    private studentService: StudentService,
    private tutorService: TutorService,
    private teacherService: TeacherService,
    private subjectService: SubjectService,
    private announcementService: AnnouncementService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.studentService.getStudents().subscribe(data => this.totalStudents.set(data.length));
    this.tutorService.getTutors().subscribe(data => this.totalTutors.set(data.length));
    this.teacherService.getStaff().subscribe(data => this.totalStaff.set(data.length));
    this.subjectService.getSubjects().subscribe(data => this.totalSubjects.set(data.length));
    this.announcementService.getAnnouncements().subscribe(data => {
      this.announcements.set(data.filter((a: any) => a.scope !== 'PRIVATE_STUDENT').slice(0, 3));
    });
  }
}