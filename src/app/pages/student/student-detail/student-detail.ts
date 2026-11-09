import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnnouncementService } from '../../../services/announcements/announcements';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentService } from '../../../services/student/student';
import { Student } from '../../../models/student';
import { StudentForm } from '../student-form/student-form';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StudentForm],
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.css'
})
export class StudentDetail implements OnInit {
  student = signal<Student | null>(null); editOpen=false;
  observation='';observationBusy=false;observationMessage='';observationError='';
  get isTeacher():boolean{return sessionStorage.getItem('current_user_role')==='TEACHER';}
  sendObservation():void{
    const student=this.student(); const text=this.observation.trim();
    if(!this.isTeacher||!student?.id||text.length<8){this.observationError='Escribí una observación de al menos 8 caracteres.';return;}
    this.observationBusy=true;this.observationError='';this.observationMessage='';
    this.announcements.createAnnouncement({title:'Observación de '+student.firstName,content:text,category:'OBSERVACION',scope:'PRIVATE_STUDENT',targetStudentId:student.id,isPinned:false})
    .subscribe({next:()=>{this.observationBusy=false;this.observation='';this.observationMessage='Observación enviada a los tutores vinculados.';},
      error:e=>{this.observationBusy=false;this.observationError=e.status===403?'No tenés autorización para este alumno.':'No se pudo enviar la observación.';}});
  }

  medicalRecord = signal<any>(null);
  pickups = signal<any[]>([]);
  restrictions = signal<any[]>([]);
  get canEditStudent():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
  get canViewMedical():boolean{return ['DIRECTOR','ADMINISTRATIVE','PRECEPTOR'].includes(sessionStorage.getItem('current_user_role')||'');}
  get canViewPickups():boolean{return this.canViewMedical;}
  get canViewRestrictions():boolean{return this.canViewMedical;}
  get canViewFamily():boolean{return !['TEACHER'].includes(sessionStorage.getItem('current_user_role')||'');}

  constructor(
    private route: ActivatedRoute,
    private studentService: StudentService,private router:Router,private announcements:AnnouncementService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadStudentData(id);
    }
  }

  loadStudentData(id: string) {
    this.studentService.getStudentById(id).subscribe(data => this.student.set(data));
    if(this.canViewMedical)this.studentService.getMedicalRecord(id).subscribe(data => this.medicalRecord.set(data));
    if(this.canViewPickups)this.studentService.getAuthorizedPickups(id).subscribe(data => this.pickups.set(data));
    if(this.canViewRestrictions)this.studentService.getJudicialRestrictions(id).subscribe(data => this.restrictions.set(data));
  }

  afterEdit(id:string):void {this.editOpen=false;this.loadStudentData(id);}
  bajaStudent() {
    const s = this.student();
    if (s?.id && confirm("¿Dar de baja a este alumno?")) {
      this.studentService.bajaStudent(s.id).subscribe(() => {
        this.router.navigate(['/students']);
      });
    }
  }
}