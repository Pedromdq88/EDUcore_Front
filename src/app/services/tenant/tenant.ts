import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tenant } from '../../models/tenant';

export function getMultiTenantHeaders(): HttpHeaders {
  const institutionId = sessionStorage.getItem('current_institution_id') || '';
  const token = sessionStorage.getItem('educore_access_token') || '';
  
  return new HttpHeaders({
    'Content-Type': 'application/json',
    'X-Institution-Id': institutionId,
    'Authorization': `Bearer ${token}`
  });
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = 'http://localhost:8080/api/v1';

  constructor(private http: HttpClient) {}

  getPublicInstitutions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/public/institutions`);
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/institution/profile`, { headers: getMultiTenantHeaders() });
  }

  updateProfile(tenant: Tenant): Observable<Tenant> {
    return this.http.put<Tenant>(`${this.apiUrl}/institution/profile`, tenant, { headers: getMultiTenantHeaders() });
  }
}