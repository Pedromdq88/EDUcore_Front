export interface Tenant {
  id?: string;
  name: string;
  legalName: string;
  district: string;
  sector: string;
  levels: string;
  shifts: string;
  city: string;
  academicYear: number;
  cue: string;
  dipregep: string;
  phone: string;
  email: string;
  address: string;
  educationLevel?: string;
  levelDisplayName?: string;
}