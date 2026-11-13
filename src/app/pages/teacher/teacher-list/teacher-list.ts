import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TeacherService } from '../../../services/teacher/teacher';
import { Teacher } from '../../../models/teacher';
import { TeacherForm } from '../teacher-form/teacher-form';
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-teacher-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TeacherForm],
  templateUrl: './teacher-list.html',
  styleUrl: './teacher-list.css'
})
export class TeacherList implements OnInit {
  staffList = signal<Teacher[]>([]);
  query = '';
  role = 'ALL';
  error = '';
  message = '';
  modalOpen = false;
  modalStaffId = '';
  accountBusy = '';
  get canEdit(): boolean {
    return ['DIRECTOR', 'ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || '');
  }
  activate(t: Teacher): void {
    if (!t.id)
      return;
    this.accountBusy = t.id;
    this.teacherService.activateStaffAccount(t.id).subscribe({
      next: r => {
        this.accountBusy = '';
        this.message = r.status === 'CREATED' ? `Cuenta ${r.email} habilitada. Contraseña inicial: DNI sin puntos; cambio obligatorio.` : `${r.email} ya tiene acceso.`;
      },
      error: e => {
        this.accountBusy = '';
        this.error = e?.error?.message || `No se pudo activar la cuenta (HTTP ${e.status}).`;
      }
    });
  }
  openModal(id = ''): void {
    this.modalStaffId = id;
    this.modalOpen = true;
  }
  onSaved(): void {
    const created = !this.modalStaffId;
    this.modalOpen = false;
    this.loadStaff();
    this.message = created ? 'Personal registrado y cuenta de acceso creada con el correo y el DNI como clave temporal.' : 'Legajo de personal actualizado correctamente.';
  }
  get roles(): string[] {
    return [...new Set(this.staffList().map(s => s.role).filter(Boolean))].sort();
  }
  get filteredStaff(): Teacher[] {
    const q = this.query.trim().toLowerCase();
    return this.staffList().filter(t => (this.role === 'ALL' || t.role === this.role) && (!q || [t.firstName, t.lastName, t.email, t.classroom].join(' ').toLowerCase().includes(q)));
  }
  constructor(private teacherService: TeacherService) { }
  ngOnInit(): void {
    this.loadStaff();
  }
  loadStaff() {
    this.error = '';
    this.teacherService.getStaff().subscribe({
      next: data => this.staffList.set(data),
      error: e => {
        this.error = e?.status === 401
          ? 'Sesión vencida. Cerrá sesión y volvé a entrar como Director o Administrativo.'
          : e?.status === 403
            ? 'El rango de tu cuenta no permite consultar el listado de personal.'
            : e?.error?.message || `No se pudo cargar el personal (HTTP ${e?.status || 'sin conexión'}).`;
      }
    });
  }
}
