import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { Tenant } from '../../models/tenant';

export function getMultiTenantHeaders(): HttpHeaders {
  const institutionId = sessionStorage.getItem('current_institution_id') || '';
  const token = sessionStorage.getItem('educore_access_token') || '';
  let headers = new HttpHeaders({'Content-Type': 'application/json', 'X-Institution-Id': institutionId});
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private apiUrl = 'http://localhost:8080/api/v1';
  private cachedProfile?: Observable<any>;
  private cachedFor = '';
  invalidateProfile():void { this.cachedProfile=undefined; }

  constructor(private http: HttpClient) {}

  getPublicInstitutions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/public/institutions`);
  }

  getProfile(): Observable<any> {
    const tenant=sessionStorage.getItem('current_institution_id')||'';
    if (!this.cachedProfile || this.cachedFor!==tenant) {
      this.cachedFor=tenant;
      this.cachedProfile=this.http.get<any>(`${this.apiUrl}/institution/profile`, { headers: getMultiTenantHeaders() })
        .pipe(shareReplay({bufferSize:1,refCount:false}));
    }
    return this.cachedProfile;
  }

  getTickets():Observable<any[]>{return this.http.get<any[]>(`${this.apiUrl}/institution/profile/tickets`,{headers:getMultiTenantHeaders()});}
  createTicket(reason:string,proposedData:Tenant):Observable<any>{return this.http.post<any>(`${this.apiUrl}/institution/profile/tickets`,{reason,proposedData},{headers:getMultiTenantHeaders()});}
  resolveTicket(id:string,approve:boolean):Observable<any>{return this.http.post<any>(`${this.apiUrl}/institution/profile/tickets/${id}/resolve?approve=${approve}`,{},{headers:getMultiTenantHeaders()}).pipe(tap(()=>this.invalidateProfile()));}

  updateProfile(tenant: Tenant): Observable<Tenant> {
    return this.http.put<Tenant>(`${this.apiUrl}/institution/profile`, tenant, { headers: getMultiTenantHeaders() }).pipe(tap(()=>this.invalidateProfile()));
  }
}