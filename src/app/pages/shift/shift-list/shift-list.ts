import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShiftService } from '../../../services/shift/shift';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './shift-list.html',
  styleUrl: './shift-list.css'
})
export class ShiftList implements OnInit {
  get canEdit():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
  showForm=false;busy=false;error='';editingId='';room:any={name:'',minimumAge:3,shift:'MANANA'};
  days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  classrooms = signal<any[]>([]);


  constructor(private shiftService: ShiftService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.shiftService.getClassroomsConfig().subscribe(data => this.classrooms.set(data));

  }
  createDefaults():void {if(this.classrooms().length||!this.canEdit)return;this.busy=true;this.error='';
    this.shiftService.createDefaultClassrooms().subscribe({next:()=>{this.busy=false;this.loadData();},error:e=>{this.busy=false;this.error=e?.error?.message||'No se pudieron cargar las secciones iniciales.';}});
  }
  openRoom(room?:any):void{this.showForm=true;this.editingId=room?.id||'';this.room=room?{name:room.name,minimumAge:room.minimumAge,shift:room.shift}:{name:'',minimumAge:3,shift:'MANANA'};}
  saveRoom():void{if(!this.canEdit||!this.room.name.trim()||this.room.minimumAge<0)return;
    this.busy=true;this.error='';const req=this.editingId?this.shiftService.updateClassroomConfig(this.editingId,this.room):this.shiftService.createClassroomConfig(this.room);
    req.subscribe({next:()=>{this.busy=false;this.showForm=false;this.loadData();},error:e=>{this.busy=false;this.error='No se pudo guardar el aula (HTTP '+(e.status||'sin conexión')+').';}});
  }
  removeRoom(id:string):void{if(!this.canEdit||!confirm('¿Eliminar esta aula? Revisá antes sus alumnos y horarios asociados.'))return;
    this.shiftService.deleteClassroomConfig(id).subscribe({next:()=>this.loadData(),error:()=>this.error='No se pudo eliminar el aula: puede tener registros asociados.'});}
}