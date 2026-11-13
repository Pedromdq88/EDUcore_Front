import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs';
import { getMultiTenantHeaders } from '../../services/tenant/tenant';
import { getMedicalSections } from './tutor-medical-fields';
interface LinkedStudent {
  id: string;
  firstName: string;
  lastName: string;
}
@Component({
  selector: 'app-tutor-student-medical',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './tutor-student-medical.html',
  styleUrl: './tutor-student-medical.css',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class TutorStudentMedical implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  student = signal<LinkedStudent | null>(null);
  medical = signal<Record<string, unknown> | null>(null);
  loading = true;
  error = '';
  get sections() {
    return getMedicalSections(this.medical());
  }
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      this.error = 'No se encontró el alumno.';
      return;
    }
    const headers = getMultiTenantHeaders();
    this.http.get<LinkedStudent>(`/api/v1/auth/my-students/${encodeURIComponent(id)}`, {
      headers
    })
      .pipe(switchMap(student => {
        this.student.set(student);
        return this.http.get<Record<string, unknown>>(`/api/v1/students/${encodeURIComponent(student.id)}/medical-record`, {
          headers
        });
      }))
      .subscribe({
        next: medical => {
          this.medical.set(medical);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: err => {
          this.loading = false;
          this.error = err?.status === 403 || err?.status === 404
            ? 'No se pudo consultar la ficha médica de este alumno. Verificá que esté vinculado a tu cuenta.'
            : err?.status === 401
              ? 'Tu sesión venció. Volvé a iniciar sesión.'
              : 'No se pudo cargar la ficha médica. Intentá nuevamente.';
          this.cdr.markForCheck();
        }
      });
  }
}
