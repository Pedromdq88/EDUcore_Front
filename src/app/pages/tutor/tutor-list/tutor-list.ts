import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TutorModal } from '../../../components/tutor-modal/tutor-modal';
import { RouterModule } from '@angular/router';
import { TutorService } from '../../../services/tutor/tutor';
import { Tutor } from '../../../models/tutor';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-tutor-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TutorModal],
  templateUrl: './tutor-list.html',
  styleUrl: './tutor-list.css'
})
export class TutorList implements OnInit {
  tutors = signal<Tutor[]>([]);
  query=''; relationship='ALL'; modalOpen=false; modalTutor:Tutor|null=null;
  error='';message='';activationId='';
  get relations():string[]{return [...new Set(this.tutors().map(t=>t.relationship).filter(Boolean))].sort();}
  get filteredTutors():Tutor[]{const q=this.query.trim().toLocaleLowerCase('es');return this.tutors().filter(t=>
    (this.relationship==='ALL'||t.relationship===this.relationship) && (!q||[t.firstName,t.lastName,t.documentNumber,t.email].join(' ').toLocaleLowerCase('es').includes(q)) );}
  openModal(tutor?:Tutor):void{this.modalTutor=tutor||null;this.modalOpen=true;this.message='';}
  createdOrEdited(t:Tutor):void{this.modalOpen=false;this.loadTutors();this.message=`${t.firstName} ${t.lastName} guardado correctamente.${this.modalTutor?'':' Se creó una cuenta con su correo y DNI como clave inicial.'}`;}
  activateAccount(t:Tutor):void{if(!t.id)return;this.activationId=t.id;this.error='';this.message='';this.tutorService.activateTutorAccount(t.id).subscribe({
    next:r=>{this.activationId='';this.message=r.status==='CREATED'?`Cuenta de ${t.email} preparada o vinculada a su ficha. Si es nueva, usa el DNI sin puntos como clave temporal; si ya existía, conserva su contraseña.`:`${t.email} ya tiene cuenta registrada.`;},
    error:e=>{this.activationId='';this.error=e?.error?.detail||e?.error?.message||`No se pudo activar la cuenta (HTTP ${e.status}).`;}
  });}

  constructor(private tutorService: TutorService) {}

  ngOnInit(): void {
    this.loadTutors();
  }

  loadTutors() {
    this.tutorService.getTutors().subscribe({next:data=>this.tutors.set(data.filter((t,i,a)=>a.findIndex(x=>x.id===t.id)===i)),error:()=>this.error="No se pudieron consultar los tutores."});
  }
}