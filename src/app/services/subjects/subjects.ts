import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getMultiTenantHeaders } from '../tenant/tenant';

@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private apiUrl = 'http://localhost:8080/api/v1/subjects';

  constructor(private http: HttpClient) {}

  getSubjects(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: getMultiTenantHeaders() });
  }

  createSubject(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, { headers: getMultiTenantHeaders() });
  }

  deleteSubject(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: getMultiTenantHeaders() });
  }
}