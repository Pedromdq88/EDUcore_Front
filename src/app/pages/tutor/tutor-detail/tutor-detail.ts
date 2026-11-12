import { inject, ChangeDetectionStrategy } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TutorService } from '../../../services/tutor/tutor';
import { Tutor } from '../../../models/tutor';
import { TutorModal } from '../../../components/tutor-modal/tutor-modal';
import { apiErrorMessage } from '../../../utils/forms/api-error';
import { StudentService } from '../../../services/student/student';
import { firstValueFrom } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-tutor-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, TutorModal],
  templateUrl: './tutor-detail.html',
  styleUrl: './tutor-detail.css'
})
export class TutorDetail implements OnInit {
  private readonly dialogs=inject(UiDialogService);

  tutor = signal<Tutor | null>(null); editOpen=false; error=""; message=""; accountBusy=false; bajaBusy=false;
  linkedStudents=signal<any[]>([]);

  constructor(private route: ActivatedRoute, private tutorService: TutorService,
              private router: Router, private students: StudentService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.tutorService.getLinkedStudents(id).subscribe({next:items=>this.linkedStudents.set(items),error:()=>this.error='No se pudieron consultar los alumnos vinculados al tutor.'});
    // El backend solo expone el listado completo de tutores, sin GET por ID.
    this.tutorService.getTutors().subscribe({
      next: list => this.tutor.set(list.find(t => t.id === id) ?? null),
      error: err => console.error('Error al cargar tutor:', err)
    });
  }
  afterEdit(t:Tutor):void{this.editOpen=false;this.tutor.set(t);this.message='Perfil actualizado.';}
  activateAccount():void{const t=this.tutor();if(!t?.id)return;this.accountBusy=true;this.error='';
    this.tutorService.activateTutorAccount(t.id).subscribe({next:r=>{this.accountBusy=false;this.message=r.status==='CREATED'?`Cuenta ${r.email} creada; acceso inicial con DNI sin puntos.`:`La cuenta ${r.email} ya estaba registrada.`;},
      error:e=>{this.accountBusy=false;this.error=e?.error?.message||'No se pudo activar la cuenta. Verificá el correo y el DNI del tutor.';}});}
 async bajaTutor():Promise<void>{
  const tutor=this.tutor();
  if(!tutor?.id||this.bajaBusy)return;
  this.bajaBusy=true;this.error='';
  try {
    const preview=await firstValueFrom(this.tutorService.getBajaPreview(tutor.id));
    const nombres=preview.nombresAlumnosQueSeDaranDeBaja.join(', ');
    const mensaje=`Esta operación dará de baja al tutor y deshabilitará su cuenta.\n\n`+
      `${preview.alumnosQueSeDaranDeBaja} alumno(s) también se darán de baja porque se quedarían sin ningún tutor`+
      (nombres?`: ${nombres}`:'.')+`\n`+
      `${preview.alumnosQueConservanTutor} alumno(s) conservarán su matrícula: el tutor restante será el principal (se promociona si antes era secundario).\n\n`+
      `La baja incluye los registros asociados de los alumnos eliminados. ¿Confirmás?`;
    const confirmar=await this.dialogs.confirm(mensaje,'Confirmar baja de tutor y alumnos',true,'Sí, dar de baja');
    if(!confirmar){this.bajaBusy=false;return;}
    await firstValueFrom(this.tutorService.bajaTutor(tutor.id));
    this.students.invalidate();
    await this.router.navigate(['/tutors']);
  }catch(e){this.error=apiErrorMessage(e,'No se pudo completar la baja');}
  finally{this.bajaBusy=false;}
 }
}
