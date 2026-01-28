import { GoogleGenAI, Type } from "@google/genai";
import { User, Role, WalkSession, PainResponse, Recipe, PatientSummary, ExerciseAssignment, ExerciseVideo, ExerciseSessionLog } from '../types';
import { storageService } from './storageService';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-3-flash-preview';

// MOCK DATA FOR VIDEOS
export const MOCK_VIDEOS: ExerciseVideo[] = [
  { id: 'v1', numero_orden: 1, titulo: 'Variante Pararse y Sentarse', descripcion: '', youtube_video_id: 'O7oFiCMN25E', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps', 'gluteos'], repeticiones_sugeridas: '2-3 series • 8-15 reps', equipamiento_necesario: ['silla'], nivel_dificultad: 'principiante' },
  { id: 'v2', numero_orden: 2, titulo: 'Remo con Banda Elástica', descripcion: '', youtube_video_id: 'J3VFboUbubo', tipo_ejercicio: 'resistencia', grupos_musculares: ['dorsal', 'trapecio'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica'], nivel_dificultad: 'intermedio' },
  { id: 'v3', numero_orden: 3, titulo: 'Pararse y Sentarse', descripcion: '', youtube_video_id: 'gWdgSzPrncU', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps'], repeticiones_sugeridas: '2-3 series • 8-12 reps', equipamiento_necesario: ['silla'], nivel_dificultad: 'principiante' },
  { id: 'v4', numero_orden: 4, titulo: 'Extensión de Glúteo', descripcion: '', youtube_video_id: 'G00dG-33QqA', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['gluteos'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica', 'silla'], nivel_dificultad: 'intermedio' },
  { id: 'v5', numero_orden: 5, titulo: 'Extensión de Cuádriceps (V1)', descripcion: '', youtube_video_id: 'pX7DEPwYXEE', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica', 'silla'], nivel_dificultad: 'principiante' },
  { id: 'v6', numero_orden: 6, titulo: 'Extensión de Cuádriceps (V2)', descripcion: '', youtube_video_id: 'zEa1Eq3yIsw', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['tobilleras', 'silla'], nivel_dificultad: 'intermedio' },
  { id: 'v7', numero_orden: 7, titulo: 'Elevación de Talones', descripcion: '', youtube_video_id: '0caP82ZUo1I', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['pantorrillas'], repeticiones_sugeridas: '2-3 series • 15-20 reps', equipamiento_necesario: ['silla'], nivel_dificultad: 'principiante' },
  { id: 'v8', numero_orden: 8, titulo: 'Curl de Bíceps', descripcion: '', youtube_video_id: '-FNnffnCPxE', tipo_ejercicio: 'resistencia', grupos_musculares: ['biceps'], repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica', 'mancuernas'], nivel_dificultad: 'principiante' },
];

// Local storage key for logs
const LOGS_KEY = 'rehapp_exercise_logs';
const ASSIGNMENTS_KEY = 'rehapp_assignments';

/**
 * API SERVICE LAYER
 */
export const api = {

  startActivity: async (patientId: string, tipoActividad: string) => {
    await new Promise(r => setTimeout(r, 500));
    return {
      session_id: Date.now().toString(),
      meta_pasos: 4500,
      mensaje_inicio: "¡Excelente! Comienza a caminar a ritmo cómodo."
    };
  },

  reportPain: async (sessionId: string, nivelEva: number): Promise<PainResponse> => {
    if (nivelEva >= 8) {
        return {
            accion: "ALTO_INMEDIATO",
            mensaje: "🛑 DESCANSA AHORA. El dolor es demasiado alto.",
            bloquear_app: true
        };
    } 
    if (nivelEva >= 5) {
        return {
            accion: "PRECAUCION",
            mensaje: "⚠️ Reduce la velocidad ahora. Respira profundo.",
            bloquear_app: false
        };
    }
    return {
        accion: "CONTINUAR",
        mensaje: "👍 Vas muy bien. Mantén el ritmo suave.",
        bloquear_app: false
    };
  },

  generateNutritionPlan: async (ingredientes: string[], restricciones: string): Promise<Recipe | null> => {
    try {
      const prompt = `
        Eres un nutricionista experto en salud cardiovascular.
        Ingredientes: ${ingredientes.join(', ')}. Restricciones: ${restricciones}.
        Genera una receta JSON: { "nombre": "...", "beneficios": "...", "ingredientes": ["..."], "preparacion": ["..."] }
      `;

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
      if (!text) return null;
      return JSON.parse(text) as Recipe;
    } catch (error) {
      console.error("AI Error:", error);
      return null;
    }
  },

  getDoctorDashboard: async (doctorId: string): Promise<PatientSummary[]> => {
    const patients = await storageService.getPatients();
    const allSessions = await storageService.getSessions();
    
    return patients.map(p => {
        const pSessions = allSessions.filter(s => s.patientId === p.id);
        const weeklyCompliance = pSessions.length; 
        
        const sortedSessions = [...pSessions].sort((a,b) => Number(b.id) - Number(a.id));
        const lastSession = sortedSessions[0];
        const lastEva = lastSession ? lastSession.painLevel : 0;
        
        const recentHighPain = sortedSessions.slice(0, 2).filter(s => s.painLevel >= 8).length >= 1;
        const lowCompliance = weeklyCompliance < 3;

        const alerts: string[] = [];
        if (lowCompliance) alerts.push("Baja adherencia (< 3 sesiones)");
        if (recentHighPain) alerts.push(`Dolor crítico reciente (EVA ${lastEva})`);

        return {
            id: p.id,
            nombre: p.name,
            edad: p.age || 70,
            meta_pasos: 4500,
            cumplimiento_semanal: weeklyCompliance,
            alerta: alerts.length > 0,
            ultimo_dolor_eva: lastEva,
            alertas: alerts
        };
    });
  },

  getAssignedExercises: async (patientId: string): Promise<ExerciseAssignment[]> => {
    await new Promise(r => setTimeout(r, 300));
    
    const logsJson = localStorage.getItem(LOGS_KEY);
    const logs: ExerciseSessionLog[] = logsJson ? JSON.parse(logsJson) : [];
    const assignmentsJson = localStorage.getItem(ASSIGNMENTS_KEY);
    
    let assignmentsIds = ['v1', 'v3']; 
    if (assignmentsJson) {
        const allAssignments = JSON.parse(assignmentsJson);
        const patientData = allAssignments[patientId];
        if (patientData) {
            assignmentsIds = Array.isArray(patientData) ? patientData : patientData.videoIds;
        }
    }

    const today = new Date().toISOString().split('T')[0];
    const assignedVideos = MOCK_VIDEOS.filter(v => assignmentsIds.includes(v.id));

    return assignedVideos.map(video => {
        const completed = logs.some(l => 
            l.patient_id === patientId && 
            l.video_id === video.id && 
            l.fecha_realizacion === today &&
            l.completado
        );

        return {
            id: `assign_${video.id}`,
            patient_id: patientId,
            video_id: video.id,
            video: video,
            completed_today: completed
        };
    });
  },

  logExerciseSession: async (log: ExerciseSessionLog): Promise<{success: boolean, message?: string}> => {
    await new Promise(r => setTimeout(r, 400));

    const logsJson = localStorage.getItem(LOGS_KEY);
    const logs: ExerciseSessionLog[] = logsJson ? JSON.parse(logsJson) : [];
    
    const existing = logs.find(l => 
        l.patient_id === log.patient_id && 
        l.video_id === log.video_id && 
        l.fecha_realizacion === log.fecha_realizacion
    );

    if (existing) {
        return { success: false, message: "Ya registraste este ejercicio hoy." };
    }

    logs.push(log);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    return { success: true };
  },

  saveExerciseRoutine: async (patientId: string, videoIds: string[], config: any) => {
    await new Promise(r => setTimeout(r, 600));
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

  getRoutineConfig: async (patientId: string) => {
    const assignmentsJson = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!assignmentsJson) return null;
    const allAssignments = JSON.parse(assignmentsJson);
    const data = allAssignments[patientId];
    if (data && !Array.isArray(data)) return data.config;
    return null;
  },

  getPatientExerciseLogs: async (patientId: string): Promise<ExerciseSessionLog[]> => {
    await new Promise(r => setTimeout(r, 300));
    const logsJson = localStorage.getItem(LOGS_KEY);
    const logs: ExerciseSessionLog[] = logsJson ? JSON.parse(logsJson) : [];
    return logs.filter(l => l.patient_id === patientId);
  }
};