import { notBlank } from '../../validators/form.validator';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, FormGroupDirective, Validators } from '@angular/forms';
import { SubjectService } from '../../services/subjects/subjects';
@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './subjects.html',
  styleUrl: './subjects.css'
})
export class Subjects implements OnInit {
  private readonly dialogs = inject(UiDialogService);
  subjects = signal<any[]>([]);
  private readonly errorState = signal('');
  get error(): string {
    return this.errorState();
  }
  set error(value: string) {
    this.errorState.set(value);
  }
  private readonly busyState = signal(false);
  get busy(): boolean {
    return this.busyState();
  }
  set busy(value: boolean) {
    this.busyState.set(value);
  }
  get canEdit(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  subjectForm: FormGroup;
  name: FormControl;
  constructor(private api: SubjectService) {
    this.name = new FormControl<string>({ value: '', disabled: !this.canEdit }, {
      nonNullable: true,
      validators: [
        notBlank,
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(255)
      ]
    });
    this.subjectForm = new FormGroup({
      name: this.name,
    });
  }
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.api.getSubjects().subscribe({
      next: list => this.subjects.set(list),
      error: () => this.error = 'No se pudieron cargar las materias.'
    });
  }
  add(form: FormGroupDirective): void {
    if (this.busy || !this.canEdit)
      return;
    this.subjectForm.markAllAsTouched();
    if (this.subjectForm.invalid) {
      this.error = 'Revisá los campos marcados del formulario.';
      return;
    }
    const name = this.name.value.trim();
    this.busy = true;
    this.error = '';
    this.api.createSubject({
      name
    }).subscribe({
      next: () => {
        form.resetForm();
        this.busy = false;
        this.load();
      },
      error: () => {
        this.error = 'No se pudo registrar la materia.';
        this.busy = false;
      }
    });
  }
  async remove(id: string): Promise<void> {
    if (!this.canEdit || !(await this.dialogs.confirm('Si eliminás esta materia, también se quitará de las asignaciones de todos los docentes y de los horarios escolares asociados. Esta acción no se puede deshacer.', 'Eliminar materia y desvincular docentes', true, 'Sí, eliminar materia')))
      return;
    this.api.deleteSubject(id).subscribe({
      next: () => this.load(),
      error: () => this.error = 'No se pudo eliminar la materia.'
    });
  }
}
