import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getMultiTenantHeaders } from '../tenant/tenant';
@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private apiUrl = '/api/v1/announcements';
  constructor(private http: HttpClient) { }
  getAnnouncements(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, {
      headers: getMultiTenantHeaders()
    });
  }
  createAnnouncement(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, {
      headers: getMultiTenantHeaders()
    });
  }
  createPrivateStudentAnnouncement(studentId: string, payload: {
    title: string;
    content: string;
    category: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/students/${encodeURIComponent(studentId)}/private`, payload, {
      headers: getMultiTenantHeaders()
    });
  }
  getPrivateStudentAnnouncements(studentId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/students/${encodeURIComponent(studentId)}/private`, {
      headers: getMultiTenantHeaders()
    });
  }
  updatePrivateStudentAnnouncement(studentId: string, noticeId: string, payload: {
    title: string;
    content: string;
    category: string;
  }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/students/${encodeURIComponent(studentId)}/private/${encodeURIComponent(noticeId)}`, payload, {
      headers: getMultiTenantHeaders()
    });
  }
  createTeacherObservation(studentId: string, content: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/students/${encodeURIComponent(studentId)}/observations`, {
      content
    }, {
      headers: getMultiTenantHeaders()
    });
  }
  deletePrivateStudentAnnouncement(studentId: string, noticeId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/students/${encodeURIComponent(studentId)}/private/${encodeURIComponent(noticeId)}`, {
      headers: getMultiTenantHeaders()
    });
  }
  updateAnnouncement(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload, {
      headers: getMultiTenantHeaders()
    });
  }
  deleteAnnouncement(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: getMultiTenantHeaders()
    });
  }
}
