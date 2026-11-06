export interface Tutor {
  id?: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  relationship: string;
  phone: string;
  phoneFijo?: string;
  email: string;
  nacionalidad: string;
  profesion: string;
  condicionActividad: string;
  convive: string;
  direccion: string;
  tenantId?: string;
}