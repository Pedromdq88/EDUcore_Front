import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { getMultiTenantHeaders } from '../tenant/tenant';
@Injectable({
  providedIn: 'root'
})
export class SubjectService {
  private apiUrl = '/api/v1/subjects';
  private cache?: Observable<any[]>;
  private cacheTenant = '';
  invalidate(): void {
    this.cache = undefined;
  }
  constructor(private http: HttpClient) { }
  getSubjects(): Observable<any[]> {
    const tenant = sessionStorage.getItem('current_institution_id') || '';
    if (!this.cache || this.cacheTenant !== tenant) {
      this.cacheTenant = tenant;
      this.cache = this.http.get<any[]>(this.apiUrl, {
        headers: getMultiTenantHeaders()
      }).pipe(shareReplay({
        bufferSize: 1,
        refCount: false
      }));
    }
    return this.cache;
  }
  createSubject(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, {
      headers: getMultiTenantHeaders()
    }).pipe(tap(() => this.invalidate()));
  }
  deleteSubject(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: getMultiTenantHeaders()
    }).pipe(tap(() => this.invalidate()));
  }
}
