import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Teacher } from '../../models/teacher';
import { getMultiTenantHeaders } from '../tenant/tenant';


@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private apiUrl = 'http://localhost:8080/api/v1/institution/staff';

  constructor(private http: HttpClient) {}

  getStaff(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(this.apiUrl, { headers: getMultiTenantHeaders() });
  }

  createStaff(teacher: Teacher): Observable<Teacher> {
    return this.http.post<Teacher>(this.apiUrl, teacher, { headers: getMultiTenantHeaders() });
  }

  updateStaff(id: string, teacher: Teacher): Observable<Teacher> {
    return this.http.put<Teacher>(`${this.apiUrl}/${id}`, teacher, { headers: getMultiTenantHeaders() });
  }

  bajaStaff(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/baja`, {}, { headers: getMultiTenantHeaders() });
  }
}