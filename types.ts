
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
  // Persisted settings
  dailyStepGoal?: number; 
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

// NUEVO: Métricas Específicas del Ensayo Clínico (Basado en PDF)
export interface ClinicalTrialMetrics {
  fecha_evaluacion: string;
  peso_kg: number;
  imc: number;
  fc_reposo: number;
  fc_max_teorica: number; // 220 - edad
  fc_reserva: number; // FCMax - FCReposo
  itb_derecho: number; // Índice Tobillo Brazo
  itb_izquierdo: number;
  test_marcha_6min_metros: number; // Capacidad funcional
  sts_30_seg_reps: number; // Fuerza EEII
  cuestionario_eq5d_puntaje: number; // Calidad de vida
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
  // Summary of trial data
  last_clinical_metrics?: ClinicalTrialMetrics;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// VIDEO MODULE TYPES

export interface ExerciseVideo {
  id: string;
  numero_orden: number;
  titulo: string;
  descripcion: string;
  youtube_video_id: string;
  tipo_ejercicio: string;
  grupos_musculares: string[];
  repeticiones_sugeridas: string;
  equipamiento_necesario: string[];
  nivel_dificultad: string;
  duracion_estimada_minutos: number; // Nuevo para calcular volumen total
}

export interface ExerciseAssignment {
  id: string;
  patient_id: string;
  video_id: string;
  video: ExerciseVideo; // Joined
  completed_today: boolean; // Computed for UI
  last_completed_at?: string; // For UI info
}

export interface ExerciseSessionLog {
  patient_id: string;
  video_id: string;
  fecha_realizacion: string; // YYYY-MM-DD
  timestamp: string; // ISO Full Date Time
  series_completadas: number;
  repeticiones_completadas: number;
  dificultad_percibida: number;
  dolor_durante_ejercicio: number | null;
  completado: boolean;
}

export const PAIN_THRESHOLD_ALERT = 8;