import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { validEmail, validNumericPhone } from '../../../validators/identity.validator';
import { TenantService } from '../../../services/tenant/tenant';
import { StudentService } from '../../../services/student/student';
import { Tenant } from '../../../models/tenant';
import { canAdvanceAcademicYear, nextCycleUnlockDate } from '../../../utils/academic-year-policy';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tenant-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tenant-form.html',
  styleUrl: './tenant-form.css'
})
export class TenantForm implements OnInit {
  private readonly dialogs = inject(UiDialogService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  reason = '';
  private originalAcademicYear: number | null = null;
  acknowledgedYearChange = false;

  get currentYear(): number | null { return this.originalAcademicYear; }
  get yearChangeRequested(): boolean {
    return this.originalAcademicYear !== null &&
      Number(this.tenant.academicYear) !== this.originalAcademicYear;
  }
  get unlockDate(): string { return nextCycleUnlockDate(this.originalAcademicYear ?? new Date().getFullYear()); }
  get yearChangeEnabled(): boolean {
    return this.originalAcademicYear !== null && canAdvanceAcademicYear(this.originalAcademicYear);
  }

  get isDirector(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }

  tenant: Tenant = {
    name: '',
    legalName: '',
    district: '',
    sector: '',
    levels: '',
    shifts: '',
    city: '',
    academicYear: new Date().getFullYear(),
    cue: '',
    dipregep: '',
    phone: '',
    email: '',
    address: ''
  };

  constructor(
    private tenantService: TenantService,
    private students: StudentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tenantService.getProfile().subscribe({
      next: data => {
        const profile = data?.profile || data;
        if (!profile) {
          this.error.set('No se pudo recuperar el perfil institucional.');
          this.loading.set(false);
          return;
        }
        this.tenant = { ...profile };
        this.originalAcademicYear = Number(profile.academicYear) || null;
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('No se pudo cargar el perfil institucional. No se guardarán cambios hasta recuperar los datos actuales.');
        this.loading.set(false);
      }
    });
  }

  async saveTenant(): Promise<void> {
    if (this.loading() || this.busy()) return;
    if (this.originalAcademicYear === null) {
      this.error.set('No se pudo verificar el ciclo lectivo actual. Volvé a cargar el perfil antes de guardar.');
      return;
    }
    if (!this.tenant.name?.trim() || !this.tenant.legalName?.trim()) {
      this.error.set('Completá los campos obligatorios de la institución.');
      return;
    }
    const email = String(this.tenant.email || '').trim();
    if (email && !validEmail(email)) {
      this.error.set('El correo institucional no tiene un formato válido.');
      return;
    }
    if (!validNumericPhone(this.tenant.phone)) {
      this.error.set('El teléfono institucional debe contener solo números (6 a 20 dígitos).');
      return;
    }
    if (!this.isDirector && !this.reason.trim()) {
      this.error.set('Ingresá el motivo de la solicitud.');
      return;
    }
    const newYear = Number(this.tenant.academicYear);
    if (!Number.isInteger(newYear) || newYear < 2000 || newYear > 2100) {
      this.error.set('Ingresá un ciclo lectivo válido entre 2000 y 2100.');
      return;
    }
    if (newYear < this.originalAcademicYear) {
      this.error.set(`El ciclo activo es ${this.originalAcademicYear}. No se puede volver al ciclo ${newYear}.`);
      return;
    }
    if (newYear > this.originalAcademicYear + 1) {
      this.error.set(`Solo podés avanzar al ciclo ${this.originalAcademicYear + 1}.`);
      return;
    }
    if (newYear > this.originalAcademicYear) {
      if (!this.yearChangeEnabled) {
        this.error.set(`El cambio al ciclo ${newYear} estará habilitado desde el ${this.unlockDate}.`);
        return;
      }
      if (!this.isDirector) {
        this.error.set('Solo Dirección o Administración pueden aplicar cambios de ciclo.');
        return;
      }
      if (!this.acknowledgedYearChange) {
        this.error.set('Marcá la confirmación de que comprendés que el cambio de ciclo no se puede deshacer.');
        return;
      }
      const approved = await this.dialogs.confirm(
        `ATENCIÓN: vas a cambiar del ciclo ${this.originalAcademicYear} al ${newYear}. Todos los alumnos activos pasarán a «Sin asignar». Las aulas anteriores no se recuperarán automáticamente y NO PODRÁS VOLVER ATRÁS desde EDUcore. ¿Confirmás el cambio definitivo?`,
        'Cambio de ciclo irreversible',
        true,
        'Sí, cambiar ciclo'
      );
      if (!approved) return;
    }
    if (this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    const request = this.isDirector
      ? this.tenantService.updateProfile(this.tenant)
      : this.tenantService.createTicket(this.reason.trim(), this.tenant);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        if (this.isDirector) this.students.invalidate();
        void this.dialogs.notify(this.isDirector
          ? 'Datos actualizados.'
          : 'Solicitud enviada a Dirección para su aprobación.');
        void this.router.navigate(['/school-profile']);
      },
      error: err => {
        const detail = err?.error?.message || err?.error?.detail;
        this.error.set(typeof detail === 'string' && detail.trim()
          ? detail
          : `No se pudieron guardar los cambios (HTTP ${err?.status || 'sin conexión'}).`);
      }
    });
  }
}
