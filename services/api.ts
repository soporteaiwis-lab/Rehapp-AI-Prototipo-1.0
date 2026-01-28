import { GoogleGenAI, Type } from "@google/genai";
import { User, Role, WalkSession, PainResponse, Recipe, PatientSummary, ExerciseAssignment, ExerciseVideo, ExerciseSessionLog, ClinicalTrialMetrics } from '../types';
import { storageService } from './storageService';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-3-flash-preview';

// Hardcoded Videos for fallback/UI usage
export const MOCK_VIDEOS: ExerciseVideo[] = [
  {
    id: 'v1',
    numero_orden: 1,
    titulo: 'Flexión Plantar (Puntillas)',
    descripcion: 'Levantamiento de talones sosteniéndose de una silla o pared. Fundamental para activar la bomba muscular de la pantorrilla.',
    youtube_video_id: 'JByo4Yh-1kI', 
    tipo_ejercicio: 'Fuerza',
    grupos_musculares: ['Pantorrillas', 'Gastrocnemio'],
    repeticiones_sugeridas: '3 series de 10 repeticiones',
    equipamiento_necesario: ['silla'],
    nivel_dificultad: 'Bajo',
    duracion_estimada_minutos: 5
  },
  {
    id: 'v2',
    numero_orden: 2,
    titulo: 'Sentadilla en Silla (Sit to Stand)',
    descripcion: 'Sentarse y pararse de una silla con control, manteniendo la espalda recta. Mejora fuerza de cuádriceps y glúteos.',
    youtube_video_id: '52M4eQfQ2k0',
    tipo_ejercicio: 'Fuerza',
    grupos_musculares: ['Cuádriceps', 'Glúteos'],
    repeticiones_sugeridas: '3 series de 8 repeticiones',
    equipamiento_necesario: ['silla'],
    nivel_dificultad: 'Medio',
    duracion_estimada_minutos: 6
  },
  {
    id: 'v3',
    numero_orden: 3,
    titulo: 'Extensión de Rodilla Sentado',
    descripcion: 'Sentado en silla, extender la rodilla completamente y bajar lento. Fortalece cuádriceps sin impacto.',
    youtube_video_id: 'yZg7s8zTzMg', 
    tipo_ejercicio: 'Fuerza',
    grupos_musculares: ['Cuádriceps'],
    repeticiones_sugeridas: '3 series de 12 repeticiones',
    equipamiento_necesario: ['silla'],
    nivel_dificultad: 'Bajo',
    duracion_estimada_minutos: 5
  },
  {
    id: 'v4',
    numero_orden: 4,
    titulo: 'Abducción de Cadera de Pie',
    descripcion: 'De pie, sujetándose de una silla, elevar la pierna lateralmente. Fortalece glúteo medio para estabilidad.',
    youtube_video_id: 'fqX47z2HwDo',
    tipo_ejercicio: 'Equilibrio/Fuerza',
    grupos_musculares: ['Glúteo Medio'],
    repeticiones_sugeridas: '2 series de 10 por pierna',
    equipamiento_necesario: ['silla'],
    nivel_dificultad: 'Medio',
    duracion_estimada_minutos: 5
  },
  {
    id: 'v5',
    numero_orden: 5,
    titulo: 'Marcha Estática (High Knees)',
    descripcion: 'Simular caminar levantando exageradamente las rodillas en el lugar. Mejora capacidad aeróbica y flexores de cadera.',
    youtube_video_id: 'FhK8_v7qXgU', 
    tipo_ejercicio: 'Aeróbico',
    grupos_musculares: ['Cardio', 'Flexores Cadera'],
    repeticiones_sugeridas: '2 minutos continuos',
    equipamiento_necesario: [],
    nivel_dificultad: 'Medio',
    duracion_estimada_minutos: 3
  }
];

// Helper for consistent Local Date (YYYY-MM-DD) handling across the app
export const getLocalDateString = (): string => {
    const d = new Date();
    // Use offset to get local YYYY-MM-DD regardless of browser timezone oddities
    const offset = d.getTimezoneOffset() * 60000; 
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

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

  // --- NEW: GEMINI TEXT TO SPEECH ---
  generateTextToSpeech: async (text: string): Promise<string | null> => {
    try {
        // Using the specific model for TTS as per instructions
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: text }] },
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        // The API returns raw audio bytes in base64 within inlineData
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("TTS Error:", error);
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

  // --- VIDEO MANAGEMENT (Dynamic) ---

  getAllVideos: async (): Promise<ExerciseVideo[]> => {
    return await storageService.getVideos();
  },

  saveVideoToLibrary: async (video: ExerciseVideo): Promise<void> => {
    await storageService.saveVideo(video);
  },

  deleteVideoFromLibrary: async (videoId: string): Promise<void> => {
    await storageService.deleteVideo(videoId);
  },

  getAssignedExercises: async (patientId: string): Promise<ExerciseAssignment[]> => {
    const logsJson = localStorage.getItem(LOGS_KEY);
    const logs: ExerciseSessionLog[] = logsJson ? JSON.parse(logsJson) : [];
    
    const assignmentsJson = localStorage.getItem(ASSIGNMENTS_KEY);
    
    // Default assignment if none exists: Videos from the DB
    const allVideos = await storageService.getVideos();
    let assignmentsIds = allVideos.map(v => v.id);
    let config = { series: 2, reps: 10, notes: "" }; // Default config

    if (assignmentsJson) {
        const allAssignments = JSON.parse(assignmentsJson);
        const patientData = allAssignments[patientId];
        if (patientData) {
            assignmentsIds = Array.isArray(patientData) ? patientData : patientData.videoIds;
            // Inject Doctor Config
            if (patientData.config) {
                config = patientData.config;
            }
        }
    }

    const today = getLocalDateString();
    
    // Filter videos that are assigned (dynamically fetched)
    const assignedVideos = allVideos.filter(v => assignmentsIds.includes(v.id));

    // MAP AND SORT BY NUMERO_ORDEN TO ENSURE CORRECT DISPLAY
    const mapped = assignedVideos.map(video => {
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
            last_completed_at: todaysLog?.timestamp,
            // Inject Prescription
            assigned_series: Number(config.series) || 2,
            assigned_reps: Number(config.reps) || 10,
            doctor_notes: config.notes || ""
        };
    });

    // STRICT SORTING: Always rely on 'numero_orden'
    return mapped.sort((a, b) => a.video.numero_orden - b.video.numero_orden);
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
    const patientLogs = logs.filter(l => String(l.patient_id) === String(patientId));
    
    // Sort by timestamp descending (newest first) for better visibility
    return patientLogs.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
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