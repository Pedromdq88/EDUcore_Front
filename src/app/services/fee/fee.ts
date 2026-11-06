import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getMultiTenantHeaders } from '../tenant/tenant';

@Injectable({
  providedIn: 'root'
})
export class FeeService {
  private apiUrl = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient) {}

  getStudentFees(studentId: string, academicYear: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/students/${studentId}/fees?academicYear=${academicYear}`, { headers: getMultiTenantHeaders() });
  }

  toggleStudentFee(studentId: string, academicYear: number, monthNumber: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/${studentId}/fees/toggle?academicYear=${academicYear}&monthNumber=${monthNumber}`, {}, { headers: getMultiTenantHeaders() });
  }

  getInstitutionalEmails(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/institutions/settings/emails`, { headers: getMultiTenantHeaders() });
  }

  updateInstitutionalEmails(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/institutions/settings/emails`, payload, { headers: getMultiTenantHeaders() });
  }
}