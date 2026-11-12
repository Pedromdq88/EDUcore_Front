import { inject, ChangeDetectionStrategy } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { ValidateSubmitDirective } from '../../utils/forms/validate-submit.directive'
import { FieldValidationDirective } from '../../utils/forms/field-validation.directive';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SubjectService } from '../../services/subjects/subjects';
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,selector:'app-subjects',standalone:true,imports: [FieldValidationDirective, ValidateSubmitDirective, FormsModule],templateUrl:'./subjects.html',styleUrl:'./subjects.css'})
export class Subjects implements OnInit {
  private readonly dialogs=inject(UiDialogService);

 subjects=signal<any[]>([]); name=''; private readonly errorState = signal('');
  get error(): string {return this.errorState();}
  set error(value: string) {this.errorState.set(value);}
   private readonly busyState = signal(false);
  get busy(): boolean {return this.busyState();}
  set busy(value: boolean) {this.busyState.set(value);}
  
 get canEdit():boolean { return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || ''); }
 constructor(private api:SubjectService){}
 ngOnInit():void {this.load();}
 load():void {this.api.getSubjects().subscribe({next:list=>this.subjects.set(list),error:()=>this.error='No se pudieron cargar las materias.'});}
 add():void {if(this.busy)return;

  const name=this.name.trim();if(!name || !this.canEdit)return;
  this.busy=true;this.error='';this.api.createSubject({name}).subscribe({next:()=>{this.name='';this.busy=false;this.load();},error:()=>{this.error='No se pudo registrar la materia.';this.busy=false;}});
 }
 async remove(id:string):Promise<void>{
  if(!this.canEdit || !(await this.dialogs.confirm(
   'Si eliminás esta materia, también se quitará de las asignaciones de todos los docentes y de los horarios escolares asociados. Esta acción no se puede deshacer.',
   'Eliminar materia y desvincular docentes', true, 'Sí, eliminar materia')))return;
  this.api.deleteSubject(id).subscribe({next:()=>this.load(),error:()=>this.error='No se pudo eliminar la materia.'});
 }
}
