import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { getMultiTenantHeaders } from '../tenant/tenant';
import { Student } from '../../models/student';


@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'http://localhost:8080/api/v1/students';
  private cache?: Observable<Student[]>;
  private cacheTenant='';
  invalidate():void {this.cache=undefined;}

  constructor(private http: HttpClient) {}

  getStudents(): Observable<Student[]> {
    const tenant=sessionStorage.getItem('current_institution_id')||'';
    if(!this.cache || this.cacheTenant!==tenant){
      this.cacheTenant=tenant;
      this.cache=this.http.get<Student[]>(this.apiUrl,{headers:getMultiTenantHeaders()}).pipe(shareReplay({bufferSize:1,refCount:false}));
    }
    return this.cache;
  }

  getStudentById(id: string): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/${id}`, { headers: getMultiTenantHeaders() });
  }

  createStudent(student: Student): Observable<Student> {
    return this.http.post<Student>(this.apiUrl, student, { headers: getMultiTenantHeaders() }).pipe(tap(()=>this.invalidate()));
  }

  updateStudent(id: string, student: Student): Observable<Student> {
    return this.http.put<Student>(`${this.apiUrl}/${id}`, student, { headers: getMultiTenantHeaders() }).pipe(tap(()=>this.invalidate()));
  }

  bajaStudent(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/baja`, {}, { headers: getMultiTenantHeaders() }).pipe(tap(()=>this.invalidate()));
  }

  getClassroomOptions(birthDate:string, academicYear:number, shift:string): Observable<{ageAtCutoff:number;cutoffDate:string;options:Array<{id:string;name:string;minimumAge:number;shift:string}>;message:string}> {
    const params = new URLSearchParams({birthDate, academicYear:String(academicYear),shift});
    return this.http.get<any>(`${this.apiUrl}/classroom-options?${params.toString()}`, {headers:getMultiTenantHeaders()});
  }

  // El backend recibe el vínculo como un subrecurso después del alta del alumno.
  linkTutors(studentId: string, assignments: Array<{tutorId:string;relationshipType:string;isPrimary:boolean}>): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${studentId}/tutors`, assignments, { headers: getMultiTenantHeaders() }).pipe(tap(()=>this.invalidate()));
  }

  updateAuthorizedPickup(studentId: string, pickupId: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${studentId}/authorized-pickups/${pickupId}`, payload, {headers:getMultiTenantHeaders()});
  }

  // Subrecurso: Cuotas / Aranceles
  getStudentFees(studentId: string, academicYear: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${studentId}/fees?academicYear=${academicYear}`, { headers: getMultiTenantHeaders() });
  }

  toggleStudentFee(studentId: string, academicYear: number, monthNumber: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${studentId}/fees/toggle?academicYear=${academicYear}&monthNumber=${monthNumber}`, {}, { headers: getMultiTenantHeaders() });
  }

  // Subrecurso: Ficha Médica
  getMedicalRecord(studentId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${studentId}/medical-record`, { headers: getMultiTenantHeaders() });
  }

  saveMedicalRecord(studentId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${studentId}/medical-record`, payload, { headers: getMultiTenantHeaders() });
  }

  // Subrecurso: Personas Autorizadas para Retiro
  getAuthorizedPickups(studentId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${studentId}/authorized-pickups`, { headers: getMultiTenantHeaders() });
  }

  createAuthorizedPickup(studentId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${studentId}/authorized-pickups`, payload, { headers: getMultiTenantHeaders() });
  }

  deleteAuthorizedPickup(studentId: string, pickupId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${studentId}/authorized-pickups/${pickupId}`, { headers: getMultiTenantHeaders() });
  }

  // Subrecurso: Restricciones Judiciales
  getJudicialRestrictions(studentId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${studentId}/judicial-restrictions`, { headers: getMultiTenantHeaders() });
  }

  createJudicialRestriction(studentId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${studentId}/judicial-restrictions`, payload, { headers: getMultiTenantHeaders() });
  }

  deleteJudicialRestriction(studentId: string, restrictionId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${studentId}/judicial-restrictions/${restrictionId}`, { headers: getMultiTenantHeaders() });
  }
}