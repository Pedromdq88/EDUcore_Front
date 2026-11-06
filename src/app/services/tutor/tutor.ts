import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tutor } from '../../models/tutor';
import { getMultiTenantHeaders } from '../tenant/tenant';


@Injectable({
  providedIn: 'root'
})
export class TutorService {
  private apiUrl = 'http://localhost:8080/api/v1/tutors';

  constructor(private http: HttpClient) {}

  getTutors(): Observable<Tutor[]> {
    return this.http.get<Tutor[]>(this.apiUrl, { headers: getMultiTenantHeaders() });
  }

  createTutor(tutor: Tutor): Observable<Tutor> {
    return this.http.post<Tutor>(this.apiUrl, tutor, { headers: getMultiTenantHeaders() });
  }

  updateTutor(id: string, tutor: Tutor): Observable<Tutor> {
    return this.http.put<Tutor>(`${this.apiUrl}/${id}`, tutor, { headers: getMultiTenantHeaders() });
  }

  bajaTutor(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/baja`, {}, { headers: getMultiTenantHeaders() });
  }
}