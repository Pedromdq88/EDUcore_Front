import { notBlank, integer, timeOfDay, scheduleOrder } from '../../validators/form.validator';
import { ChangeDetectorRef } from '@angular/core';
import { inject } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
import { canDiscardForm } from '../../utils/forms/form-ux';
import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { CalendarService } from '../../services/calendar/calendar';
import { ShiftService } from '../../services/shift/shift';
interface RoomSchedule {
  id: string;
  classroomId: string;
  subject: string;
  teacherName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}
interface SchoolEvent {
  id: string;
  date: string;
  title: string;
  category: string;
  section: string;
}
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css'
})
export class Calendar implements OnInit {
  private readonly formCdr = inject(ChangeDetectorRef);
  private readonly dialogs = inject(UiDialogService);
  readonly canDiscardForm = canDiscardForm;
  section: 'school' | 'rooms' = 'school';
  roomView: 'week' | 'month' = 'week';
  monthOffset = 0;
  newEvent = false;
  selectedEvent: SchoolEvent | null = null;
  newSchedule = false;
  editingScheduleId = '';
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
  rooms = signal<any[]>([]);
  schedules = signal<RoomSchedule[]>([]);
  schedulesReady = false;
  events = signal<SchoolEvent[]>([]);
  days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  roomDays = this.days.slice(0, 5);
  eventForm: FormGroup;
  scheduleForm: FormGroup;
  roomFilter: FormControl;
  eventTitle: FormControl;
  eventDate: FormControl;
  eventCategory: FormControl;
  eventSection: FormControl;
  classroomId: FormControl;
  subject: FormControl;
  teacherName: FormControl;
  dayOfWeek: FormControl;
  startTime: FormControl;
  endTime: FormControl;
  constructor(private calendar: CalendarService, private shifts: ShiftService) {
    this.roomFilter = new FormControl<string>('', {
      nonNullable: true
    });
    this.eventTitle = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.required, Validators.maxLength(255)]
    });
    this.eventDate = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.eventCategory = new FormControl<string>('GENERAL', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.eventSection = new FormControl<string>('GENERAL', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.classroomId = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    });
    this.subject = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.required, Validators.maxLength(255)]
    });
    this.teacherName = new FormControl<string>('', {
      nonNullable: true,
      validators: [notBlank, Validators.required, Validators.maxLength(255)]
    });
    this.dayOfWeek = new FormControl<number>(1, {
      nonNullable: true,
      validators: [integer, Validators.required, Validators.min(1), Validators.max(5)]
    });
    this.startTime = new FormControl<string>('08:00', {
      nonNullable: true,
      validators: [timeOfDay, Validators.required]
    });
    this.endTime = new FormControl<string>('09:00', {
      nonNullable: true,
      validators: [timeOfDay, Validators.required]
    });
    this.eventForm = new FormGroup({
      eventTitle: this.eventTitle,
      eventDate: this.eventDate,
      eventCategory: this.eventCategory,
      eventSection: this.eventSection
    });
    this.scheduleForm = new FormGroup({
      classroomId: this.classroomId,
      subject: this.subject,
      teacherName: this.teacherName,
      dayOfWeek: this.dayOfWeek,
      startTime: this.startTime,
      endTime: this.endTime
    }, {
      validators: [scheduleOrder, group => {
        const value = group.getRawValue();
        if (!value.startTime || !value.endTime)
          return null;
        const conflict = this.schedules().some(item => item.id !== this.editingScheduleId &&
          Number(item.dayOfWeek) === Number(value.dayOfWeek) &&
          (item.classroomId === value.classroomId || item.teacherName.trim().toLowerCase() === String(value.teacherName).trim().toLowerCase()) &&
          value.startTime.padEnd(8, ':00') < item.endTime.padEnd(8, ':00') && item.startTime.padEnd(8, ':00') < value.endTime.padEnd(8, ':00'));
        return conflict ? {
          overlap: true
        } : null;
      }]
    });
  }
  ngOnInit(): void {
    this.loadAll();
  }
  openNewEvent(): void {
    if (!this.canEdit)
      return;
    this.error = '';
    this.newEvent = true;
  }
  get canEdit(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  get isTutor(): boolean {
    return sessionStorage.getItem('current_user_role') === 'TUTOR';
  }
  get monthDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + this.monthOffset, 1);
  }
  get monthLabel(): string {
    return this.monthDate.toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric'
    });
  }
  get filteredSchedules(): RoomSchedule[] {
    return this.schedules().filter(x => x.dayOfWeek >= 1 && x.dayOfWeek <= 5 && (!this.roomFilter.value || x.classroomId === this.roomFilter.value)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  get roomWeek(): {
    day: string;
    entries: RoomSchedule[];
  }[] {
    return this.roomDays.map((day, i) => ({
      day,
      entries: this.filteredSchedules.filter(s => s.dayOfWeek === i + 1)
    }));
  }
  get monthCells(): {
    date: string;
    day: number;
    inMonth: boolean;
    events: SchoolEvent[];
    entries: RoomSchedule[];
  }[] {
    const first = this.monthDate;
    const padding = (first.getDay() + 6) % 7;
    const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = [];
    const total = Math.ceil((count + padding) / 7) * 7;
    for (let i = 0;i < total;i++) {
      const d = new Date(first.getFullYear(), first.getMonth(), i - padding + 1);
      const date = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
      ].join('-');
      const dayOfWeek = (d.getDay() + 6) % 7 + 1;
      cells.push({
        date,
        day: d.getDate(),
        inMonth: d.getMonth() === first.getMonth(),
        events: this.events().filter(e => e.date === date),
        entries: this.filteredSchedules.filter(e => dayOfWeek <= 5 && e.dayOfWeek === dayOfWeek)
      });
    }
    return this.section === 'rooms' ? cells.filter(cell => {
      const day = new Date(cell.date + 'T12:00:00').getDay();
      return day !== 0 && day !== 6;
    }) : cells;
  }
  roomName(id: string): string {
    return this.rooms().find(r => r.id === id)?.name || 'Aula sin nombre';
  }
  loadAll(): void {
    this.error = '';
    this.schedulesReady = false;
    this.calendar.getEvents().subscribe({
      next: a => this.events.set(a),
      error: () => this.error = 'No se pudo cargar el calendario escolar.'
    });
    this.shifts.getClassroomsConfig().subscribe({
      next: a => this.rooms.set(a),
      error: () => this.error = 'No se pudo cargar el catálogo de aulas.'
    });
    this.shifts.getClassSchedules().subscribe({
      next: a => {
        this.schedules.set(a);
        this.schedulesReady = true;
        this.scheduleForm.updateValueAndValidity();
      },
      error: () => this.error = 'No se pudieron cargar los horarios.'
    });
  }
  saveEvent(): void {
    this.eventForm.markAllAsTouched();
    if (this.eventForm.invalid) {
      this.error = "Corregí los campos marcados.";
      return;
    }
    if (this.busy)
      return;
    if (!this.canEdit)
      return;
    this.busy = true;
    this.calendar.createEvent({
      title: this.eventTitle.value.trim(),
      date: this.eventDate.value,
      category: this.eventCategory.value,
      section: this.eventSection.value
    }).subscribe({
      next: () => {
        this.busy = false;
        this.newEvent = false;
        this.eventTitle.setValue('');
        this.loadAll();
      },
      error: () => {
        this.busy = false;
        this.error = 'No se pudo registrar el evento.';
      }
    });
  }
  openEventOn(date: string): void {
    if (!this.canEdit)
      return;
    this.error = '';
    this.eventDate.setValue(date);
    this.eventTitle.setValue('');
    this.eventCategory.setValue('GENERAL');
    this.eventSection.setValue('GENERAL');
    this.newEvent = true;
  }
  viewEvent(event: SchoolEvent): void {
    this.selectedEvent = event;
  }
  async removeEvent(id: string): Promise<void> {
    if (!this.canEdit || !(await this.dialogs.confirm('¿Eliminar este evento?')))
      return;
    this.calendar.deleteEvent(id).subscribe({
      next: () => this.loadAll(),
      error: () => this.error = 'No se pudo eliminar el evento.'
    });
  }
  openSchedule(record?: RoomSchedule): void {
    this.error = '';
    this.newSchedule = true;
    this.editingScheduleId = record?.id || '';
    this.classroomId.setValue(record?.classroomId || this.rooms()[0]?.id || '');
    this.subject.setValue(record?.subject || '');
    this.teacherName.setValue(record?.teacherName || '');
    this.dayOfWeek.setValue(record?.dayOfWeek || 1);
    this.startTime.setValue(record?.startTime?.slice(0, 5) || '08:00');
    this.endTime.setValue(record?.endTime?.slice(0, 5) || '09:00');
  }
  saveSchedule(): void {
    if (!this.schedulesReady) {
      this.error = 'Esperá a que se carguen los horarios para comprobar superposiciones.';
      return;
    }
    this.scheduleForm.markAllAsTouched();
    if (this.scheduleForm.invalid) {
      this.error = "Corregí los campos marcados.";
      return;
    }
    if (this.busy)
      return;
    if (!this.canEdit)
      return;
    this.error = '';
    this.busy = true;
    const item = {
      classroomId: this.classroomId.value,
      subject: this.subject.value.trim(),
      teacherName: this.teacherName.value.trim(),
      dayOfWeek: Number(this.dayOfWeek.value),
      startTime: this.startTime.value,
      endTime: this.endTime.value
    };
    this.shifts.saveClassSchedule(item, this.editingScheduleId || undefined).subscribe({
      next: () => {
        this.busy = false;
        this.newSchedule = false;
        this.loadAll();
      },
      error: (err) => {
        this.busy = false;
        this.error = err.status === 409 ? 'Superposición: el aula o docente ya tiene un horario en ese momento.' : 'No se pudo guardar el horario.';
      }
    });
  }
  async removeSchedule(id: string): Promise<void> {
    if (!this.canEdit || !(await this.dialogs.confirm('¿Eliminar este horario recurrente?')))
      return;
    this.shifts.deleteClassSchedule(id).subscribe({
      next: () => this.loadAll(),
      error: () => this.error = 'No se pudo eliminar el horario.'
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
