import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getMultiTenantHeaders } from '../tenant/tenant';
export interface VerificationResult {
  valid: boolean;
  message: string;
}
@Injectable({
  providedIn: 'root'
})
export class EmailVerificationService {
  private readonly api = '/api/v1/verify-contact-email';
  constructor(private http: HttpClient) { }
  request(email: string): Observable<VerificationResult> {
    return this.http.post<VerificationResult>(`${this.api}/request`, {
      email
    }, {
      headers: getMultiTenantHeaders()
    });
  }
  confirm(email: string, code: string): Observable<VerificationResult> {
    return this.http.post<VerificationResult>(`${this.api}/confirm`, {
      email,
      code
    }, {
      headers: getMultiTenantHeaders()
    });
  }
}
