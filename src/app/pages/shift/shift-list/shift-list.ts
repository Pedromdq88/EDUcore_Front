import { ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../../utils/forms/form-ux';
import { ValidateSubmitDirective } from '../../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../../utils/forms/field-validation.directive';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShiftService } from '../../../services/shift/shift';
import { StudentService } from '../../../services/student/student';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-shift-list',
  standalone: true,
  imports: [FieldValidationDirective, ValidateSubmitDirective, CommonModule, RouterLink, FormsModule],
  templateUrl: './shift-list.html',
  styleUrl: './shift-list.css'
})
export class ShiftList implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);

  private readonly dialogs=inject(UiDialogService);

  readonly canDiscardForm = canDiscardForm;
  get canEdit():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
  showForm=false;private readonly busyState = signal(false);
  get busy(): boolean {return this.busyState();}
  set busy(value: boolean) {this.busyState.set(value);}
  private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
  editingId='';room:any={name:'',minimumAge:3,shift:'MANANA'};
  days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  classrooms = signal<any[]>([]);


  constructor(private shiftService: ShiftService, private studentService: StudentService) {}

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
  saveRoom():void{if(this.busy)return;if(!this.canEdit||!this.room.name.trim()||this.room.minimumAge<0)return;
    this.busy=true;this.error='';const req=this.editingId?this.shiftService.updateClassroomConfig(this.editingId,this.room):this.shiftService.createClassroomConfig(this.room);
    req.subscribe({next:()=>{this.busy=false;this.showForm=false;this.studentService.invalidate();this.loadData();},error:e=>{this.busy=false;this.error='No se pudo guardar el aula (HTTP '+(e.status||'sin conexión')+').';}});
  }
  async removeRoom(id:string):Promise<void>{if(!this.canEdit||!(await this.dialogs.confirm(
      'Los alumnos de esta aula quedarán como Sin asignar. También se quitarán las asignaciones docentes y los horarios de esta aula. ¿Querés continuar?',
      'Eliminar aula y desvincular alumnos', true, 'Sí, eliminar aula')))return;
    this.shiftService.deleteClassroomConfig(id).subscribe({next:()=>{this.studentService.invalidate();this.loadData();},error:()=>this.error='No se pudo eliminar el aula: puede tener registros asociados.'});}

  /** Conservar los campos hasta que la persona acepte descartar los cambios. */
  async confirmDiscard(form: { dirty?: boolean | null } | null | undefined, target: string): Promise<void> {
    if (form?.dirty && !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios'))) return;
    this.formCdr.markForCheck();
    if (target === 'dismissed') {
      (this as any).dismissed?.emit();
    } else {
      (this as any)[target] = false;
      this.formCdr.markForCheck();
    }
  }
}