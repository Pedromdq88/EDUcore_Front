import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { Tutor } from '../../models/tutor';
import { getMultiTenantHeaders } from '../tenant/tenant';


@Injectable({
  providedIn: 'root'
})
export class TutorService {
  private apiUrl = '/api/v1/tutors';
  private cache?:Observable<Tutor[]>; private cacheTenant='';
  invalidate():void{this.cache=undefined;}

  constructor(private http: HttpClient) {}

  getTutors(): Observable<Tutor[]> {
    const tenant=sessionStorage.getItem('current_institution_id')||'';
    if(!this.cache||this.cacheTenant!==tenant){
      this.cacheTenant=tenant;
      this.cache=this.http.get<Tutor[]>(this.apiUrl,{headers:getMultiTenantHeaders()}).pipe(shareReplay({bufferSize:1,refCount:false}));
    }
    return this.cache;
  }

  getLinkedStudents(tutorId:string):Observable<Array<{id:string;firstName:string;lastName:string;documentNumber:string;classroom:string}>> {
    return this.http.get<Array<{id:string;firstName:string;lastName:string;documentNumber:string;classroom:string}>>(`${this.apiUrl}/${tutorId}/students`,{headers:getMultiTenantHeaders()});
  }

  createTutor(tutor: Tutor): Observable<Tutor> {
    return this.http.post<Tutor>(this.apiUrl, tutor, { headers: getMultiTenantHeaders() }).pipe(tap(()=>this.invalidate()));
  }

  updateTutor(id: string, tutor: Tutor): Observable<Tutor> {
    return this.http.put<Tutor>(`${this.apiUrl}/${id}`, tutor, { headers: getMultiTenantHeaders() }).pipe(tap(()=>this.invalidate()));
  }

  activateTutorAccount(id:string):Observable<{status:string;email:string}> {
    return this.http.post<{status:string;email:string}>(`${this.apiUrl}/${id}/activate-account`,{},{headers:getMultiTenantHeaders()});
  }

  getBajaPreview(id: string): Observable<{
    alumnosQueSeDaranDeBaja: number;
    alumnosQueConservanTutor: number;
    nombresAlumnosQueSeDaranDeBaja: string[];
  }> {
    return this.http.get<{
      alumnosQueSeDaranDeBaja:number;
      alumnosQueConservanTutor:number;
      nombresAlumnosQueSeDaranDeBaja:string[];
    }>(`${this.apiUrl}/${id}/baja-preview`, {headers:getMultiTenantHeaders()});
  }

  bajaTutor(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/baja`, {}, { headers: getMultiTenantHeaders() }).pipe(tap(()=>this.invalidate()));
  }
}