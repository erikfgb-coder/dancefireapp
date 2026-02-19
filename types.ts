
export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
  JUSTIFIED = 'justified'
}

export enum PaymentStatus {
  PAID = 'paid',
  PENDING = 'pending',
  OVERDUE = 'overdue'
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  monthlyFee: number;
  registrationDate: string;
  conditions: string;
  active: boolean;
}

export interface AttendanceRecord {
  studentId: string;
  date: string;
  status: AttendanceStatus;
}

export interface PaymentRecord {
  studentId: string;
  month: number;
  year: number;
  paymentDate?: string;
  baseAmount: number;
  surcharge: number;
  totalPaid: number;
  status: PaymentStatus;
}

export interface ScholarshipResult {
  firstPlaceId: string;
  secondPlaceId: string;
  justification: string;
  evaluationDate: string;
}
