export interface Assignment {
  id?: string;
  subject: string;
  classroom: string;
  shift: string;
  isClassroomTeacher: boolean;
}

export interface Teacher {
  id?: string;
  firstName: string;
  lastName: string;
  documentNumber?: string;
  email: string;
  password?: string;
  role: string;
  phone: string;
  hireDate: string;
  classroom: string | null;
  status: string;
  tenantId?: string;
  assignments: Assignment[];
}

export interface Portfolio {
  id?: string;
  staffId: string;
  title: string;
  category: string;
  activityDate: string;
  description: string;
  mediaUrl: string | null;
}