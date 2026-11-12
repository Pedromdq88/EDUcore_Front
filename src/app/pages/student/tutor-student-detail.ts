import { Component, OnInit, signal, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { getMultiTenantHeaders, TenantService } from '../../services/tenant/tenant';
import { FeeService } from '../../services/fee/fee';
import { AnnouncementService } from '../../services/announcements/announcements';
import { forkJoin } from 'rxjs';

interface LinkedTutor {
  id: string; firstName: string; lastName: string; relationship: string; phone: string | null;
}
interface MyChild {
  id: string; firstName: string; lastName: string; documentNumber: string;
  legajoNumber: string | null; birthDate: string; classroom: string;
  academicYear: number; shift: string; status: string; nationality: string | null;
  address: string | null; contactPhone: string | null; cuil: string | null;
  genderIdentity: string | null; birthCountry: string | null; birthProvince: string | null;
  birthLocality: string | null; addressDistrict: string | null; hasSiblings: boolean | null;
  siblingCount: number | null; tutors: LinkedTutor[];
}
interface AuthorizedPickup {
  id: string; fullName: string; relationship: string; documentNumber: string; phone: string;
}
interface StudentFee { monthNumber: number; status: string; amount: number; }
interface FamilyNotice {
  id: string; title: string; content: string; category: string; scope: string;
  targetClassroom: string | null; targetStudentId: string | null; createdAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-tutor-student-detail', standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './tutor-student-detail.html', styleUrl: './tutor-student-detail.css'
})
export class TutorStudentDetail implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  child = signal<MyChild | null>(null);
  medical = signal<Record<string, unknown> | null>(null);
  pickups = signal<AuthorizedPickup[]>([]);
  fees = signal<StudentFee[]>([]);
  notices = signal<FamilyNotice[]>([]);
  noticeLoading = false;
  noticeError = '';
  loading = true;
  medicalLoading = false;
  pickupsLoading = false;
  feesLoading = false;
  error = '';
  medicalError = '';
  pickupError = '';
  feeError = '';
  academicYear = 0;
  readonly months = [{number:0,label:'Matrícula'},
    ...['Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
      .map((label,index) => ({number:index+3,label}))];

  constructor(private route: ActivatedRoute, private http: HttpClient,
    private feesApi: FeeService, private school: TenantService,
    private noticesApi: AnnouncementService) {}

  ngOnInit(): void {
    const studentId = this.route.snapshot.paramMap.get('id');
    if (!studentId) { this.loading = false; this.error = 'Falta identificar al alumno.'; this.cdr.markForCheck(); return; }
    this.http.get<MyChild>(`/api/v1/auth/my-students/${encodeURIComponent(studentId)}`,
      {headers: getMultiTenantHeaders()}).subscribe({
        next: child => {
          this.child.set(child);
          this.loading = false;
          this.loadMedical(child.id);
          this.loadPickups(child.id);
          this.loadFees(child.id, child.academicYear);
          this.loadNotices(child);
          this.cdr.markForCheck();
        },
        error: err => {
          this.loading = false;
          this.error = err?.status === 403 || err?.status === 404
            ? 'Este alumno no está vinculado a tu cuenta de Tutor, o ya no pertenece a la institución.'
            : err?.status === 401
              ? 'Tu sesión venció. Volvé a iniciar sesión.'
              : 'No se pudo cargar el perfil del alumno. Intentá nuevamente.';
          this.cdr.markForCheck();
        }
      });
  }

  private loadMedical(id: string): void {
    this.medicalLoading = true;
    this.medicalError = '';
    this.cdr.markForCheck();
    this.http.get<Record<string,unknown>>(`/api/v1/students/${encodeURIComponent(id)}/medical-record`,
      {headers: getMultiTenantHeaders()}).subscribe({
        next: rec => {
          this.medical.set(rec);
          this.medicalLoading = false;
          this.cdr.markForCheck();
        },
        error: err => {
          this.medicalLoading = false;
          this.medicalError = this.requestError('No se pudo consultar la ficha médica', err);
          this.cdr.markForCheck();
        }
      });
  }
  private loadPickups(id: string): void {
    this.pickupsLoading = true;
    this.pickupError = '';
    this.cdr.markForCheck();
    this.http.get<AuthorizedPickup[]>(`/api/v1/students/${encodeURIComponent(id)}/authorized-pickups`,
      {headers: getMultiTenantHeaders()}).subscribe({
        next: rows => {
          this.pickups.set(rows);
          this.pickupsLoading = false;
          this.cdr.markForCheck();
        },
        error: err => {
          this.pickupsLoading = false;
          this.pickupError = this.requestError('No se pudieron consultar las personas autorizadas', err);
          this.cdr.markForCheck();
        }
      });
  }
  private loadFees(id: string, fallbackYear: number): void {
    this.feesLoading = true;
    this.feeError = '';
    this.cdr.markForCheck();
    this.school.getProfile().subscribe({
      next: profile => {
        const year = Number((profile?.profile || profile)?.academicYear);
        this.academicYear = Number.isInteger(year) && year > 2000 ? year : fallbackYear;
        this.feesApi.getStudentFees(id, this.academicYear).subscribe({
          next: fees => {
            this.fees.set(fees);
            this.feesLoading = false;
            this.cdr.markForCheck();
          },
          error: err => {
            this.feesLoading = false;
            this.feeError = this.requestError('No se pudo consultar el estado de cuotas', err);
            this.cdr.markForCheck();
          }
        });
      },
      error: err => {
        this.feesLoading = false;
        this.feeError = this.requestError('No se pudo consultar el ciclo lectivo institucional', err);
        this.cdr.markForCheck();
      }
    });
  }

  private loadNotices(child: MyChild): void {
    this.noticeLoading = true;
    this.noticeError = '';
    this.cdr.markForCheck();
    forkJoin({
      general: this.noticesApi.getAnnouncements(),
      private: this.noticesApi.getPrivateStudentAnnouncements(child.id)
    }).subscribe({
      next: ({general, private: privateNotices}) => {
        const visible = (general as FamilyNotice[]).filter(n =>
          n.scope === 'GLOBAL' ||
          (n.scope === 'CLASSROOM' && n.targetClassroom === child.classroom) ||
          (n.scope === 'TEACHER_OBSERVATION' && n.targetStudentId === child.id));
        this.notices.set([...privateNotices, ...visible].sort((a,b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')));
        this.noticeLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.noticeLoading = false;
        this.noticeError = this.requestError('No se pudieron consultar los avisos', err);
        this.cdr.markForCheck();
      }
    });
  }
  private requestError(message: string, err: {status?: number} | null): string {
    const status = err?.status;
    if (status === 401) return 'Tu sesión venció. Volvé a iniciar sesión.';
    if (status === 403) return `${message}: tu cuenta no tiene permiso para consultar estos datos (HTTP 403).`;
    if (status === 404) return `${message}: no se encontró el recurso (HTTP 404).`;
    if (status === 0) return `${message}: no se pudo conectar con el servidor.`;
    return `${message}${status ? ` (HTTP ${status})` : ''}.`;
  }

  get medicalFields(): Array<{key: string; label: string; value: string}> {
    const data = this.medical();
    if (!data?.['id']) return [];
    const excluded = new Set(['id', 'studentId', 'tenantId']);
    return Object.entries(data)
      .filter(([key,value]) => !excluded.has(key) && value !== null && value !== undefined && value !== '')
      .map(([key,value]) => ({key,
        label: key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,c => c.toUpperCase()),
        value: typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value)}));
  }
  feeState(month: number): string {
    const item = this.fees().find(f => Number(f.monthNumber) === month);
    return String(item?.status || 'INACTIVE').toUpperCase();
  }
  hasMedical(): boolean { return !!this.medical()?.['id']; }
}
