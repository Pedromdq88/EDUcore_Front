import { getMultiTenantHeaders } from '../tenant/tenant';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private apiUrl = 'http://localhost:8080/api/v1/portfolios';

  constructor(private http: HttpClient) {}

  getPortfoliosByStaff(staffId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?staffId=${staffId}`, { headers: getMultiTenantHeaders() });
  }

  createPortfolio(payload: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, { headers: getMultiTenantHeaders() });
  }

  deletePortfolio(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: getMultiTenantHeaders() });
  }
}