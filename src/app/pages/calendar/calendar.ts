import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar/calendar';
import { ShiftService } from '../../services/shift/shift';

interface RoomSchedule {id:string;classroomId:string;subject:string;teacherName:string;dayOfWeek:number;startTime:string;endTime:string}
interface SchoolEvent {id:string;date:string;title:string;category:string;section:string}

@Component({selector:'app-calendar',standalone:true,imports:[FormsModule],templateUrl:'./calendar.html',styleUrl:'./calendar.css'})
export class Calendar implements OnInit {
  section:'school'|'rooms'='school';roomView:'week'|'month'='week';monthOffset=0;
  roomFilter='';newEvent=false;newSchedule=false;editingScheduleId='';error='';busy=false;
  rooms=signal<any[]>([]);schedules=signal<RoomSchedule[]>([]);events=signal<SchoolEvent[]>([]);
  days=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  eventTitle='';eventDate='';eventCategory='GENERAL';eventSection='GENERAL';
  classroomId='';subject='';teacherName='';dayOfWeek=1;startTime='08:00';endTime='09:00';
  constructor(private calendar:CalendarService,private shifts:ShiftService){}
  ngOnInit():void {this.loadAll();}
  get canEdit():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
  get monthDate():Date {const now=new Date();return new Date(now.getFullYear(),now.getMonth()+this.monthOffset,1);}
  get monthLabel():string{return this.monthDate.toLocaleDateString('es-AR',{month:'long',year:'numeric'});}
  get filteredSchedules():RoomSchedule[]{return this.schedules().filter(x=>!this.roomFilter || x.classroomId===this.roomFilter).sort((a,b)=>a.startTime.localeCompare(b.startTime));}
  get roomWeek():{day:string;entries:RoomSchedule[]}[]{return this.days.map((day,i)=>({day,entries:this.filteredSchedules.filter(s=>s.dayOfWeek===i+1)}));}
  get monthCells():{date:string;day:number;inMonth:boolean;events:SchoolEvent[];entries:RoomSchedule[]}[] {
    const first=this.monthDate;const padding=(first.getDay()+6)%7;
    const count=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();const cells=[];
    const total=Math.ceil((count+padding)/7)*7;
    for(let i=0;i<total;i++){
      const d=new Date(first.getFullYear(),first.getMonth(),i-padding+1);
      const date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
      const dayOfWeek=(d.getDay()+6)%7+1;
      cells.push({date,day:d.getDate(),inMonth:d.getMonth()===first.getMonth(),
       events:this.events().filter(e=>e.date===date),entries:this.filteredSchedules.filter(e=>e.dayOfWeek===dayOfWeek)});
    }
    return cells;
  }
  roomName(id:string):string{return this.rooms().find(r=>r.id===id)?.name||'Aula sin nombre';}
  loadAll():void {
    this.error='';
    this.calendar.getEvents().subscribe({next:a=>this.events.set(a),error:()=>this.error='No se pudo cargar el calendario escolar.'});
    this.shifts.getClassroomsConfig().subscribe({next:a=>this.rooms.set(a),error:()=>this.error='No se pudo cargar el catálogo de aulas.'});
    this.shifts.getClassSchedules().subscribe({next:a=>this.schedules.set(a),error:()=>this.error='No se pudieron cargar los horarios.'});
  }
  saveEvent():void {
    if(!this.canEdit || !this.eventTitle.trim() || !this.eventDate)return;
    this.busy=true;this.calendar.createEvent({title:this.eventTitle.trim(),date:this.eventDate,category:this.eventCategory,section:this.eventSection}).subscribe({
      next:()=>{this.busy=false;this.newEvent=false;this.eventTitle='';this.loadAll();},
      error:()=>{this.busy=false;this.error='No se pudo registrar el evento.';}
    });
  }
  removeEvent(id:string):void{
    if(!this.canEdit || !confirm('¿Eliminar este evento?'))return;
    this.calendar.deleteEvent(id).subscribe({next:()=>this.loadAll(),error:()=>this.error='No se pudo eliminar el evento.'});
  }
  openSchedule(record?:RoomSchedule):void {
    this.newSchedule=true;this.editingScheduleId=record?.id||'';
    this.classroomId=record?.classroomId||this.rooms()[0]?.id||'';this.subject=record?.subject||'';
    this.teacherName=record?.teacherName||'';this.dayOfWeek=record?.dayOfWeek||1;
    this.startTime=record?.startTime?.slice(0,5)||'08:00';this.endTime=record?.endTime?.slice(0,5)||'09:00';
  }
  saveSchedule():void {
    if(!this.canEdit || !this.classroomId || !this.subject.trim() || !this.teacherName.trim() || !this.startTime || !this.endTime)return;
    if(this.startTime>=this.endTime){this.error='La hora de finalización debe ser posterior a la inicial.';return;}
    this.error='';this.busy=true;
    const item={classroomId:this.classroomId,subject:this.subject.trim(),teacherName:this.teacherName.trim(),dayOfWeek:Number(this.dayOfWeek),startTime:this.startTime,endTime:this.endTime};
    this.shifts.saveClassSchedule(item,this.editingScheduleId||undefined).subscribe({
      next:()=>{this.busy=false;this.newSchedule=false;this.loadAll();},
      error:(err)=>{this.busy=false;this.error=err.status===409?'Superposición: el aula o docente ya tiene un horario en ese momento.':'No se pudo guardar el horario.';}
    });
  }
  removeSchedule(id:string):void{
    if(!this.canEdit || !confirm('¿Eliminar este horario recurrente?'))return;
    this.shifts.deleteClassSchedule(id).subscribe({next:()=>this.loadAll(),error:()=>this.error='No se pudo eliminar el horario.'});
  }
}
