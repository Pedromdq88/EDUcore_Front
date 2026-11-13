import { ChangeDetectorRef } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../../utils/forms/form-ux';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Teacher } from '../../../models/teacher';
import { TeacherService } from '../../../services/teacher/teacher';
import { PortfolioService } from '../../../services/portfolios/portfolios';
import { TeacherForm } from '../teacher-form/teacher-form';
@Component({
  selector: 'app-teacher-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TeacherForm],
  templateUrl: './teacher-detail.html',
  styleUrl: './teacher-detail.css'
})
export class TeacherDetail implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);
  private readonly dialogs = inject(UiDialogService);
  readonly canDiscardForm = canDiscardForm;
  get canEdit(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  teacher = signal<Teacher | null>(null);
  editOpen = false;
  portfolios = signal<any[]>([]);
  portfolioOpen = false;
  private readonly portfolioBusyState = signal(false);
  get portfolioBusy(): boolean {
    return this.portfolioBusyState();
  }
  set portfolioBusy(value: boolean) {
    this.portfolioBusyState.set(value);
  }
  private readonly portfolioErrorState = signal('');
  get portfolioError(): string {
    return this.portfolioErrorState();
  }
  set portfolioError(value: string) {
    this.portfolioErrorState.set(value);
  }
  portfolioEditId = '';
  portfolioForm: FormGroup;
  title: FormControl;
  description: FormControl;
  category: FormControl;
  activityDate: FormControl;
  mediaUrl: FormControl;
  constructor(private route: ActivatedRoute, private teacherService: TeacherService, private portfolioService: PortfolioService, private router: Router) {
    this.title = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)]
    });
    this.description = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(5000)]
    });
    this.category = new FormControl<string>('CURSO', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.activityDate = new FormControl<string>(new Date().toISOString().slice(0, 10), {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.mediaUrl = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.pattern(/^(?:|https?:\/\/\S+)$/)]
    });
    this.portfolioForm = new FormGroup({
      title: this.title,
      description: this.description,
      category: this.category,
      activityDate: this.activityDate,
      mediaUrl: this.mediaUrl
    });
  }
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTeacherData(id);
    }
  }
  loadTeacherData(id: string) {
    this.teacherService.getStaffById(id).subscribe({
      next: found => this.teacher.set(found),
      error: () => this.portfolioError = "No se pudo cargar el personal."
    });
    this.portfolioService.getPortfoliosByStaff(id).subscribe(data => this.portfolios.set(data));
  }
  savePortfolio(): void {
    this.portfolioForm.markAllAsTouched();
    if (this.portfolioForm.invalid) {
      this.portfolioError = "Revisá los campos marcados.";
      return;
    }
    if (this.portfolioBusy)
      return;
    const t = this.teacher();
    if (!t?.id || !this.title.value.trim())
      return;
    this.portfolioBusy = true;
    this.portfolioError = '';
    const op = this.portfolioEditId ? this.portfolioService.updatePortfolio(this.portfolioEditId, {
      ...this.portfolioForm.getRawValue(),
      staffId: t.id
    }) : this.portfolioService.createPortfolio({
      ...this.portfolioForm.getRawValue(),
      staffId: t.id
    });
    op.subscribe({
      next: () => {
        this.portfolioBusy = false;
        this.portfolioOpen = false;
        this.portfolioEditId = '';
        this.portfolioService.getPortfoliosByStaff(t.id!).subscribe(list => this.portfolios.set(list));
      },
      error: () => {
        this.portfolioBusy = false;
        this.portfolioError = 'No se pudo guardar el portfolio.';
      }
    });
  }
  editPortfolio(item: any): void {
    this.portfolioForm.patchValue({
      title: item.title,
      description: item.description,
      category: item.category,
      activityDate: item.activityDate,
      mediaUrl: item.mediaUrl || ''
    });
    this.portfolioEditId = item.id;
    this.portfolioOpen = true;
  }
  async removePortfolio(id: string): Promise<void> {
    const t = this.teacher();
    if (!t?.id || !(await this.dialogs.confirm('¿Eliminar este portfolio?')))
      return;
    this.portfolioService.deletePortfolio(id).subscribe({
      next: () => this.portfolioService.getPortfoliosByStaff(t.id!).subscribe(list => this.portfolios.set(list)),
      error: () => this.portfolioError = 'No se pudo eliminar el portfolio.'
    });
  }
  afterEdit(id: string): void {
    this.editOpen = false;
    this.loadTeacherData(id);
  }
  roleName(role: string): string {
    return ({
      DIRECTOR: 'Director/a',
      ADMINISTRATIVE: 'Administración',
      PRECEPTOR: 'Preceptor/a',
      TEACHER: 'Docente'
    } as Record<string, string>)[role] || role || 'No informado';
  }
  shiftName(shift: string): string {
    return ({
      MANANA: 'Mañana',
      TARDE: 'Tarde',
      AMBOS: 'Ambos turnos'
    } as Record<string, string>)[shift] || shift || 'No informado';
  }
  displayValue(value: unknown): string {
    return value === null || value === undefined || value === '' ? 'No informado' : String(value);
  }
  async bajaTeacher(): Promise<void> {
    const t = this.teacher();
    if (t?.id && (await this.dialogs.confirm("¿Dar de baja a este miembro del personal?"))) {
      this.teacherService.bajaStaff(t.id).subscribe(() => {
        this.router.navigate(['/teachers']);
      });
    }
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
