import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getMultiTenantHeaders } from '../tenant/tenant';

@Injectable({
  providedIn: 'root'
})
export class ShiftService {
  private apiUrl = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient) {}

  // Configuración de Aulas y Edades (/classrooms-config)
  getClassroomsConfig(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/classrooms-config`, { headers: getMultiTenantHeaders() });
  }

  createClassroomConfig(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/classrooms-config`, payload, { headers: getMultiTenantHeaders() });
  }

  updateClassroomConfig(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/classrooms-config/${id}`, payload, { headers: getMultiTenantHeaders() });
  }

  deleteClassroomConfig(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/classrooms-config/${id}`, { headers: getMultiTenantHeaders() });
  }

  // Horarios de Aulas / Clases (/class-schedules)
  getClassSchedules(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/class-schedules`, { headers: getMultiTenantHeaders() });
  }

  saveClassSchedule(payload: any, id?: string): Observable<any> {
    const url = id ? `${this.apiUrl}/class-schedules/${id}` : `${this.apiUrl}/class-schedules`;
    const method = id ? 'PUT' : 'POST';
    return this.http.request<any>(method, url, { body: payload, headers: getMultiTenantHeaders() });
  }

  deleteClassSchedule(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/class-schedules/${id}`, { headers: getMultiTenantHeaders() });
  }
}