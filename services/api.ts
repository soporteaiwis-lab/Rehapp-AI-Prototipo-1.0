import { GoogleGenAI, Type } from "@google/genai";
import { User, Role, WalkSession, PainResponse, Recipe, PatientSummary, ExerciseAssignment, ExerciseVideo, ExerciseSessionLog, ClinicalTrialMetrics } from '../types';
import { storageService } from './storageService';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-3-flash-preview';

// Helper for consistent Local Date (YYYY-MM-DD) handling across the app
export const getLocalDateString = (): string => {
    const d = new Date();
    // Use offset to get local YYYY-MM-DD regardless of browser timezone oddities
    const offset = d.getTimezoneOffset() * 60000; 
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

// MOCK DATA FOR VIDEOS - Updated with Estimated Duration for Volume Calculation (PDF requires 60 min total)
export const MOCK_VIDEOS: ExerciseVideo[] = [
  { id: 'v1', numero_orden: 1, titulo: 'Variante Pararse y Sentarse', descripcion: 'Ejercicio básico de fuerza', youtube_video_id: 'O7oFiCMN25E', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps', 'gluteos'], repeticiones_sugeridas: '2-3 series • 8-15 reps', equipamiento_necesario: ['silla'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 5 },
  { id: 'v2', numero_orden: 2, titulo: 'Remo con Banda Elástica', descripcion: 'Ejercicio de espalda y postura', youtube_video_id: 'J3VFboUbubo', tipo_ejercicio: 'resistencia', grupos_musculares: ['dorsal', 'trapecio'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica'], nivel_dificultad: 'intermedio', duracion_estimada_minutos: 6 },
  { id: 'v3', numero_orden: 3, titulo: 'Pararse y Sentarse', descripcion: 'Ejercicio funcional clásico', youtube_video_id: 'gWdgSzPrncU', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps'], repeticiones_sugeridas: '2-3 series • 8-12 reps', equipamiento_necesario: ['silla'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 5 },
  { id: 'v4', numero_orden: 4, titulo: 'Extensión de Glúteo', descripcion: 'Fortalecimiento posterior', youtube_video_id: 'G00dG-33QqA', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['gluteos'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica', 'silla'], nivel_dificultad: 'intermedio', duracion_estimada_minutos: 4 },
  { id: 'v5', numero_orden: 5, titulo: 'Extensión de Cuádriceps (V1)', descripcion: 'Versión básica', youtube_video_id: 'pX7DEPwYXEE', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica', 'silla'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 4 },
  { id: 'v6', numero_orden: 6, titulo: 'Extensión de Cuádriceps (V2)', descripcion: 'Versión con peso', youtube_video_id: 'zEa1Eq3yIsw', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['tobilleras', 'silla'], nivel_dificultad: 'intermedio', duracion_estimada_minutos: 5 },
  { id: 'v7', numero_orden: 7, titulo: 'Elevación de Talones', descripcion: 'Para pantorrillas y retorno venoso', youtube_video_id: '0caP82ZUo1I', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['pantorrillas'], repeticiones_sugeridas: '2-3 series • 15-20 reps', equipamiento_necesario: ['silla'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 3 },
  { id: 'v8', numero_orden: 8, titulo: 'Curl de Bíceps', descripcion: 'Fuerza de brazos', youtube_video_id: '-FNnffnCPxE', tipo_ejercicio: 'resistencia', grupos_musculares: ['biceps'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica', 'mancuernas'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 4 },
];

const LOGS_KEY = 'rehapp_exercise_logs';
const ASSIGNMENTS_KEY = 'rehapp_assignments';
const CLINICAL_METRICS_KEY = 'rehapp_clinical_metrics';

export const api = {
  startActivity: async (patientId: string, tipoActividad: string) => {
    await new Promise(r => setTimeout(r, 200));
    return {
      session_id: Date.now().toString(),
      meta_pasos: 4500,
      mensaje_inicio: "¡Excelente! Comienza a caminar."
    };
  },

  reportPain: async (sessionId: string, nivelEva: number): Promise<PainResponse> => {
    if (nivelEva >= 8) {
        return { accion: "ALTO_INMEDIATO", mensaje: "🛑 DESCANSA AHORA. Según protocolo, debes esperar a que el dolor baje por completo antes de retomar.", bloquear_app: true };
    } 
    if (nivelEva >= 5) {
        return { accion: "PRECAUCION", mensaje: "⚠️ Reduce la velocidad. Estás entrando en zona de claudicación.", bloquear_app: false };
    }
    return { accion: "CONTINUAR", mensaje: "👍 Vas muy bien.", bloquear_app: false };
  },

  generateNutritionPlan: async (ingredientes: string[], restricciones: string): Promise<Recipe | null> => {
    try {
      const prompt = `Nutricionista para paciente vascular. Ingredientes: ${ingredientes.join(', ')}. Restricciones: ${restricciones}. Genera JSON: { "nombre": "", "beneficios": "", "ingredientes": [], "preparacion": [] }`;
      const result = await genAI.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nombre: { type: Type.STRING },
              beneficios: { type: Type.STRING },
              ingredientes: { type: Type.ARRAY, items: { type: Type.STRING } },
              preparacion: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });
      const text = result.text;
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error("AI Error:", error);
      return null;
    }
  },

  getDoctorDashboard: async (doctorId: string): Promise<PatientSummary[]> => {
    const patients = await storageService.getPatients();
    const allWalkSessions = await storageService.getSessions();
    const logsJson = localStorage.getItem(LOGS_KEY);
    const metricsJson = localStorage.getItem(CLINICAL_METRICS_KEY);
    
    const allExerciseLogs: ExerciseSessionLog[] = logsJson ? JSON.parse(logsJson) : [];
    const allMetrics = metricsJson ? JSON.parse(metricsJson) : {};

    return patients.map(p => {
        const pWalkSessions = allWalkSessions.filter(s => s.patientId === p.id);
        const pExerciseLogs = allExerciseLogs.filter(l => String(l.patient_id) === String(p.id));
        const uniqueExerciseDays = new Set(pExerciseLogs.map(l => l.fecha_realizacion)).size;
        
        // Criterio PDF: "Mínimo 3 sesiones semanales" (Caminata + Ejercicio)
        // Simplificamos: Asumimos sesiones de caminata como la base
        const weeklyCompliance = pWalkSessions.length; 
        
        const maxWalkPain = Math.max(0, ...pWalkSessions.map(s => s.painLevel));
        const maxExercisePain = Math.max(0, ...pExerciseLogs.map(l => l.dolor_durante_ejercicio || 0));
        const lastEva = Math.max(maxWalkPain, maxExercisePain);
        
        const recentHighPain = lastEva >= 8;
        const lowCompliance = weeklyCompliance < 3;

        const alerts: string[] = [];
        if (lowCompliance) alerts.push("Baja adherencia (< 3 ses/sem)");
        if (recentHighPain) alerts.push(`Claudicación Intensa (EVA ${lastEva})`);

        return {
            id: p.id,
            nombre: p.name,
            edad: p.age || 70,
            meta_pasos: p.dailyStepGoal || 4500,
            cumplimiento_semanal: weeklyCompliance,
            alerta: alerts.length > 0,
            ultimo_dolor_eva: lastEva,
            alertas: alerts,
            last_clinical_metrics: allMetrics[p.id] || null
        };
    });
  },

  getAssignedExercises: async (patientId: string): Promise<ExerciseAssignment[]> => {
    const logsJson = localStorage.getItem(LOGS_KEY);
    const logs: ExerciseSessionLog[] = logsJson ? JSON.parse(logsJson) : [];
    
    const assignmentsJson = localStorage.getItem(ASSIGNMENTS_KEY);
    let assignmentsIds = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']; 
    if (assignmentsJson) {
        const allAssignments = JSON.parse(assignmentsJson);
        const patientData = allAssignments[patientId];
        if (patientData) {
            assignmentsIds = Array.isArray(patientData) ? patientData : patientData.videoIds;
        }
    }

    const today = getLocalDateString();
    
    const assignedVideos = MOCK_VIDEOS.filter(v => assignmentsIds.includes(v.id));

    return assignedVideos.map(video => {
        const todaysLog = logs.find(l => 
            String(l.patient_id) === String(patientId) && 
            String(l.video_id) === String(video.id) && 
            l.fecha_realizacion === today &&
            l.completado === true
        );

        return {
            id: `assign_${video.id}_${today}`, 
            patient_id: patientId,
            video_id: video.id,
            video: video,
            completed_today: !!todaysLog,
            last_completed_at: todaysLog?.timestamp
        };
    });
  },

  logExerciseSession: async (log: ExerciseSessionLog): Promise<{success: boolean, message?: string}> => {
    const today = getLocalDateString();
    
    const logToSave: ExerciseSessionLog = {
        ...log,
        patient_id: String(log.patient_id),
        video_id: String(log.video_id),
        fecha_realizacion: today, 
        completado: true
    };

    const logsJson = localStorage.getItem(LOGS_KEY);
    const logs: ExerciseSessionLog[] = logsJson ? JSON.parse(logsJson) : [];
    
    const filteredLogs = logs.filter(l => 
        !(String(l.patient_id) === String(logToSave.patient_id) && 
          String(l.video_id) === String(logToSave.video_id) && 
          l.fecha_realizacion === logToSave.fecha_realizacion)
    );

    filteredLogs.push(logToSave);
    localStorage.setItem(LOGS_KEY, JSON.stringify(filteredLogs));
    
    return { success: true };
  },

  saveExerciseRoutine: async (patientId: string, videoIds: string[], config: any) => {
    const assignmentsJson = localStorage.getItem(ASSIGNMENTS_KEY);
    const allAssignments = assignmentsJson ? JSON.parse(assignmentsJson) : {};
    
    allAssignments[patientId] = {
        videoIds: videoIds,
        config: config,
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(allAssignments));
    return { success: true };
  },

  updatePatientTreatment: async (patientId: string, stepGoal: number) => {
    await storageService.updatePatientField(patientId, 'dailyStepGoal', stepGoal);
    return { success: true };
  },

  getRoutineConfig: async (patientId: string) => {
    const assignmentsJson = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!assignmentsJson) return null;
    const allAssignments = JSON.parse(assignmentsJson);
    const data = allAssignments[patientId];
    if (data && !Array.isArray(data)) return data.config;
    return null;
  },

  getPatientExerciseLogs: async (patientId: string): Promise<ExerciseSessionLog[]> => {
    const logsJson = localStorage.getItem(LOGS_KEY);
    const logs: ExerciseSessionLog[] = logsJson ? JSON.parse(logsJson) : [];
    return logs.filter(l => String(l.patient_id) === String(patientId));
  },

  // NEW: Save Clinical Trial Metrics (ITB, 6MWT, etc.)
  saveClinicalMetrics: async (patientId: string, metrics: ClinicalTrialMetrics) => {
    const metricsJson = localStorage.getItem(CLINICAL_METRICS_KEY);
    const allMetrics = metricsJson ? JSON.parse(metricsJson) : {};
    
    allMetrics[patientId] = metrics;
    localStorage.setItem(CLINICAL_METRICS_KEY, JSON.stringify(allMetrics));
    return { success: true };
  },

  getClinicalMetrics: async (patientId: string): Promise<ClinicalTrialMetrics | null> => {
    const metricsJson = localStorage.getItem(CLINICAL_METRICS_KEY);
    const allMetrics = metricsJson ? JSON.parse(metricsJson) : {};
    return allMetrics[patientId] || null;
  }
};