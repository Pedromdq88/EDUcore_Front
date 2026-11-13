import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getMultiTenantHeaders } from '../tenant/tenant';
export interface RoomOption {
  id: string;
  name: string;
  minimumAge: number;
  shift: string;
}
export interface PromotionCandidate {
  studentId: string;
  name: string;
  currentYear: number;
  currentClassroom: string;
  shift: string;
  options: RoomOption[];
  message: string;
}
export interface PromotionPreview {
  targetYear: number;
  pendingCount: number;
  withoutOptions: number;
  students: PromotionCandidate[];
}
export interface PromotionResult {
  promotedCount: number;
  promotedStudentIds: string[];
}
@Injectable({
  providedIn: 'root'
})
export class YearPromotionService {
  private readonly api = '/api/v1/institution/promotion';
  constructor(private http: HttpClient) { }
  preview(year: number): Observable<PromotionPreview> {
    return this.http.get<PromotionPreview>(`${this.api}/preview?targetYear=${year}`, {
      headers: getMultiTenantHeaders()
    });
  }
  execute(year: number, selections: Array<{
    studentId: string;
    classroomName: string;
  }>): Observable<PromotionResult> {
    return this.http.post<PromotionResult>(`${this.api}/execute`, {
      targetYear: year,
      selections
    }, {
      headers: getMultiTenantHeaders()
    });
  }
}
