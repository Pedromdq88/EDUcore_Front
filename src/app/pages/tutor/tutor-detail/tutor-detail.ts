import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TutorService } from '../../../services/tutor/tutor';
import { Tutor } from '../../../models/tutor';
import { TutorModal } from '../../../components/tutor-modal/tutor-modal';

@Component({
  selector: 'app-tutor-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, TutorModal],
  templateUrl: './tutor-detail.html',
  styleUrl: './tutor-detail.css'
})
export class TutorDetail implements OnInit {
  tutor = signal<Tutor | null>(null); editOpen=false; error=""; message=""; accountBusy=false;
  linkedStudents=signal<any[]>([]);

  constructor(private route: ActivatedRoute, private tutorService: TutorService,private router:Router) {}

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
 bajaTutor():void {const t=this.tutor();if(!t?.id||!confirm('¿Dar de baja a este tutor? Esta operación puede afectar a alumnos vinculados.'))return;
 this.tutorService.bajaTutor(t.id).subscribe({next:()=>this.router.navigate(['/tutors']),error:()=>alert('No se pudo dar de baja al tutor.')});}
}
