import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { getMultiTenantHeaders, TenantService } from '../../services/tenant/tenant';
import { FeeService } from '../../services/fee/fee';
import { AnnouncementService } from '../../services/announcements/announcements';

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
  selector: 'app-tutor-student-detail', standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './tutor-student-detail.html', styleUrl: './tutor-student-detail.css'
})
export class TutorStudentDetail implements OnInit {
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
    if (!studentId) { this.loading = false; this.error = 'Falta identificar al alumno.'; return; }
    this.http.get<MyChild>(`http://localhost:8080/api/v1/auth/my-students/${encodeURIComponent(studentId)}`,
      {headers: getMultiTenantHeaders()}).subscribe({
        next: child => {
          this.child.set(child);
          this.loading = false;
          this.loadMedical(child.id);
          this.loadPickups(child.id);
          this.loadFees(child.id, child.academicYear);
          this.loadNotices(child);
        },
        error: err => {
          this.loading = false;
          this.error = err?.status === 403 || err?.status === 404
            ? 'Este alumno no está vinculado a tu cuenta de Tutor, o ya no pertenece a la institución.'
            : err?.status === 401
              ? 'Tu sesión venció. Volvé a iniciar sesión.'
              : 'No se pudo cargar el perfil del alumno. Intentá nuevamente.';
        }
      });
  }

  private loadMedical(id: string): void {
    this.medicalLoading = true;
    this.http.get<Record<string,unknown>>(`http://localhost:8080/api/v1/students/${encodeURIComponent(id)}/medical-record`,
      {headers: getMultiTenantHeaders()}).subscribe({
        next: rec => { this.medical.set(rec); this.medicalLoading = false; },
        error: () => { this.medicalLoading = false; this.medicalError = 'No se pudo consultar la ficha médica.'; }
      });
  }
  private loadPickups(id: string): void {
    this.pickupsLoading = true;
    this.http.get<AuthorizedPickup[]>(`http://localhost:8080/api/v1/students/${encodeURIComponent(id)}/authorized-pickups`,
      {headers: getMultiTenantHeaders()}).subscribe({
        next: rows => { this.pickups.set(rows); this.pickupsLoading = false; },
        error: () => { this.pickupsLoading = false; this.pickupError = 'No se pudieron consultar las personas autorizadas.'; }
      });
  }
  private loadFees(id: string, fallbackYear: number): void {
    this.feesLoading = true;
    this.school.getProfile().subscribe({
      next: profile => {
        const year = Number((profile?.profile || profile)?.academicYear);
        this.academicYear = Number.isInteger(year) && year > 2000 ? year : fallbackYear;
        this.feesApi.getStudentFees(id, this.academicYear).subscribe({
          next: fees => { this.fees.set(fees); this.feesLoading = false; },
          error: () => { this.feesLoading = false; this.feeError = 'No se pudo consultar el estado de cuotas.'; }
        });
      },
      error: () => { this.feesLoading = false; this.feeError = 'No se pudo consultar el ciclo lectivo institucional.'; }
    });
  }

  private loadNotices(child: MyChild): void {
    this.noticeLoading = true;
    this.noticesApi.getAnnouncements().subscribe({
      next: rows => {
        const visible = (rows as FamilyNotice[]).filter(n =>
          n.scope === 'GLOBAL' ||
          (n.scope === 'CLASSROOM' && n.targetClassroom === child.classroom) ||
          (n.scope === 'PRIVATE_STUDENT' && n.targetStudentId === child.id));
        this.notices.set(visible);
        this.noticeLoading = false;
      },
      error: () => { this.noticeLoading = false; this.noticeError = 'No se pudieron consultar los avisos.'; }
    });
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
