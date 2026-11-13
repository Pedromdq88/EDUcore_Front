import { notBlank, integer } from '../../../validators/form.validator';
import { afterNextRender, ChangeDetectorRef, ElementRef, Injector, viewChild } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../../utils/forms/form-ux';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShiftService } from '../../../services/shift/shift';
import { StudentService } from '../../../services/student/student';
import { apiErrorMessage } from '../../../utils/forms/api-error';
@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './shift-list.html',
  styleUrl: './shift-list.css'
})
export class ShiftList implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);
  private readonly dialogs = inject(UiDialogService);
  private readonly injector = inject(Injector);
  private readonly roomNameInput = viewChild<ElementRef<HTMLInputElement>>('roomNameInput');
  readonly canDiscardForm = canDiscardForm;
  get canEdit(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  showForm = false;
  private readonly busyState = signal(false);
  get busy(): boolean {
    return this.busyState();
  }
  set busy(value: boolean) {
    this.busyState.set(value);
  }
  private readonly errorState = signal('');
  get error(): string {
    return this.errorState();
  }
  set error(value: string) {
    this.errorState.set(value);
  }
  editingId = '';
  editingRoomHadBothShifts = false;
  roomForm: FormGroup;
  name: FormControl;
  minimumAge: FormControl;
  shift: FormControl;
  days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  classrooms = signal<any[]>([]);
  constructor(private shiftService: ShiftService, private studentService: StudentService) {
    this.name = new FormControl<string>('', {
      nonNullable: true,
      validators: [
        notBlank,
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(255)
      ]
    });
    this.minimumAge = new FormControl<number>(3, {
      nonNullable: true,
      validators: [integer, Validators.required, Validators.min(0), Validators.max(25)]
    });
    this.shift = new FormControl<string>('MANANA', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(MANANA|TARDE|AMBOS)$/)]
    });
    this.roomForm = new FormGroup({
      name: this.name,
      minimumAge: this.minimumAge,
      shift: this.shift
    });
  }
  ngOnInit(): void {
    this.loadData();
  }
  loadData() {
    this.shiftService.getClassroomsConfig().subscribe(data => this.classrooms.set(data));
  }
  createDefaults(): void {
    if (this.classrooms().length || !this.canEdit)
      return;
    this.busy = true;
    this.error = '';
    this.shiftService.createDefaultClassrooms().subscribe({
      next: () => {
        this.busy = false;
        this.loadData();
      },
      error: e => {
        this.busy = false;
        this.error = e?.error?.message || 'No se pudieron cargar las secciones iniciales.';
      }
    });
  }
  openRoom(room?: any): void {
    if (!this.canEdit || this.busy)
      return;
    this.showForm = true;
    this.error = '';
    this.editingId = room?.id || '';
    this.editingRoomHadBothShifts = room?.shift === 'AMBOS';
    this.roomForm.reset(room ? {
      name: room.name,
      minimumAge: room.minimumAge,
      shift: room.shift
    } : {
      name: '',
      minimumAge: 3,
      shift: 'MANANA'
    });
    afterNextRender(() => this.roomNameInput()?.nativeElement.focus(), { injector: this.injector });
  }
  saveRoom(): void {
    this.roomForm.markAllAsTouched();
    if (this.roomForm.invalid) {
      this.error = "Revisá los campos marcados.";
      return;
    }
    if (this.busy)
      return;
    if (!this.canEdit)
      return;
    this.busy = true;
    this.error = '';
    const req = this.editingId ? this.shiftService.updateClassroomConfig(this.editingId, this.roomForm.getRawValue()) : this.shiftService.createClassroomConfig(this.roomForm.getRawValue());
    req.subscribe({
      next: () => {
        this.busy = false;
        this.showForm = false;
        this.studentService.invalidate();
        this.loadData();
      },
      error: e => {
        this.busy = false;
        this.error = apiErrorMessage(e, 'No se pudo guardar el aula.');
      }
    });
  }
  async removeRoom(id: string): Promise<void> {
    if (!this.canEdit || !(await this.dialogs.confirm('Los alumnos de esta aula quedarán como Sin asignar. También se quitarán las asignaciones docentes y los horarios de esta aula. ¿Querés continuar?', 'Eliminar aula y desvincular alumnos', true, 'Sí, eliminar aula')))
      return;
    this.shiftService.deleteClassroomConfig(id).subscribe({
      next: () => {
        this.studentService.invalidate();
        this.loadData();
      },
      error: () => this.error = 'No se pudo eliminar el aula: puede tener registros asociados.'
    });
  }
  async confirmDiscard(form: {
    dirty?: boolean | null;
  } | null | undefined, target: string): Promise<void> {
    if (form?.dirty && !(await this.dialogs.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?', 'Descartar cambios')))
      return;
    this.formCdr.markForCheck();
    if (target === 'dismissed') {
      (this as any).dismissed?.emit();
    }
    else {
      (this as any)[target] = false;
      this.formCdr.markForCheck();
    }
  }
}
