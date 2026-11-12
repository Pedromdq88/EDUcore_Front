import { Component, EventEmitter, Input, OnInit, Output, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Student } from '../../models/student';
import { ShiftService } from '../../services/shift/shift';
import { StudentService } from '../../services/student/student';
import { studentAgeAtCutoff } from '../../utils/classroom-date';

interface Classroom { id:string; name:string; shift:string; minimumAge:number; }

@Component({
  selector:'app-classroom-assignment',
  standalone:true,
  changeDetection:ChangeDetectionStrategy.Eager,
  imports:[ReactiveFormsModule],
  templateUrl:'./classroom-assignment.html',
  styleUrl:'./classroom-assignment.css'
})
export class ClassroomAssignment implements OnInit {
  @Input({required:true}) student!:Student;
  @Output() saved=new EventEmitter<void>();
  @Output() dismissed=new EventEmitter<void>();
  private readonly students=inject(StudentService);
  private readonly shifts=inject(ShiftService);
  readonly loading=signal(true);
  readonly saving=signal(false);
  readonly error=signal('');
  readonly allRooms=signal<Classroom[]>([]);
  readonly recommended=signal<string[]>([]);
  private recommendationRequest=0;
  readonly form=new FormGroup({
    shift:new FormControl('MANANA',{nonNullable:true,validators:[Validators.required]}),
    classroom:new FormControl('',{nonNullable:true,validators:[Validators.required]})
  });
  get age():number|null{return studentAgeAtCutoff(this.student.birthDate, this.student.academicYear);}
  get available():Classroom[]{
    return this.allRooms().filter(room=>room.shift===this.form.controls.shift.value || room.shift==='AMBOS');
  }
  ngOnInit():void {
    this.form.controls.shift.setValue(this.student.studentShift==='TARDE'?'TARDE':'MANANA');
    this.form.controls.shift.valueChanges.subscribe(()=>{
      this.form.controls.classroom.setValue('');
      this.refreshRecommendations();
    });
    this.shifts.getClassroomsConfig().subscribe({
      next:rooms=>{this.allRooms.set(rooms);this.loading.set(false);this.refreshRecommendations();},
      error:()=>{this.loading.set(false);this.error.set('No se pudieron cargar las aulas.');}
    });
  }
  refreshRecommendations():void {
    this.recommended.set([]);
    const request=++this.recommendationRequest;
    if(!this.student.birthDate || !this.student.academicYear)return;
    this.students.getClassroomOptions(this.student.birthDate,this.student.academicYear,this.form.controls.shift.value)
      .subscribe({
        next:data=>{if(request===this.recommendationRequest)this.recommended.set(data.options.map(room=>room.name));},
        error:()=>{if(request===this.recommendationRequest)this.recommended.set([]);}
      });
  }
  isRecommended(name:string):boolean{return this.recommended().includes(name);}
  save():void {
    if(this.saving()||this.loading())return;
    this.form.markAllAsTouched();
    if(this.form.invalid || !this.available.some(room=>room.name===this.form.controls.classroom.value))return;
    if(!this.student.id)return;
    const { classroom, shift } = this.form.getRawValue();
    this.error.set('');
    this.saving.set(true);
    this.form.disable({ emitEvent: false });
    this.students.assignClassroom(this.student.id, classroom, shift)
      .subscribe({
        next:()=>{this.saving.set(false);this.saved.emit();},
        error:e=>{
          this.saving.set(false);
          this.form.enable({ emitEvent: false });
          const detail=e?.error?.message||e?.error?.detail;
          this.error.set(typeof detail==='string' && detail.trim()
            ? detail
            : e?.status===403
              ? 'Acceso denegado. Verificá que tu sesión tenga permisos de Dirección o Administración y que el backend esté actualizado.'
              : `No se pudo asignar el aula (HTTP ${e?.status||'sin conexión'}).`);
        }
      });
  }
  cancel():void{if(!this.saving())this.dismissed.emit();}
}
