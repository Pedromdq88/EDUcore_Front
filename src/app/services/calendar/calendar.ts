import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getMultiTenantHeaders } from '../tenant/tenant';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private apiUrl = 'http://localhost:8080/api/v1/calendar/events';

  constructor(private http: HttpClient) {}

  getEvents(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: getMultiTenantHeaders() });
  }

  createEvent(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, { headers: getMultiTenantHeaders() });
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: getMultiTenantHeaders() });
  }
}