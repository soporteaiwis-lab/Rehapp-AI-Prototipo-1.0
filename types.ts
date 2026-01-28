export enum Role {
  PATIENT = 'paciente',
  DOCTOR = 'medico',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  email?: string;
  name: string;
  role: Role;
  age?: number;
  condition?: string; 
  clinicalProfile?: ClinicalProfile;
}

export interface ClinicalProfile {
  id: string;
  userId: string;
  age: number;
  weight: number;
  height: number;
  maxHeartRate?: number;
  bmi?: number;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  assignedByDoctorId: string;
  dailyStepGoal: number;
  weeklyMinutesGoal: number;
  startDate: string;
  active: boolean;
}

export interface WalkSession {
  id: string;
  patientId: string;
  treatmentPlanId?: string;
  date: string;
  durationSeconds: number;
  steps: number;
  painLevel: number;
  stoppedDueToPain: boolean;
  notes?: string;
}

export interface PainResponse {
  accion: 'ALTO_INMEDIATO' | 'PRECAUCION' | 'CONTINUAR';
  mensaje: string;
  bloquear_app: boolean;
}

export interface Recipe {
  nombre: string;
  beneficios: string;
  ingredientes: string[];
  preparacion: string[];
}

export interface PatientSummary {
  id: string;
  nombre: string;
  edad: number;
  meta_pasos: number;
  cumplimiento_semanal: number; // sessions count
  alerta: boolean;
  ultimo_dolor_eva: number;
  alertas: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const PAIN_THRESHOLD_ALERT = 8;