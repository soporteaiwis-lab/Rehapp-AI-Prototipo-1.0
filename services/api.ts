import { GoogleGenAI, Type } from "@google/genai";
import { User, Role, WalkSession, PainResponse, Recipe, PatientSummary, ExerciseAssignment, ExerciseVideo, ExerciseSessionLog, ClinicalTrialMetrics } from '../types';
import { storageService } from './storageService';
import { supabase } from '../config/supabaseClient';

// Helper to safely get env vars
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: getApiKey() });
const model = 'gemini-3-flash-preview';

// Helper for consistent Local Date (YYYY-MM-DD) handling across the app
export const getLocalDateString = (): string => {
    const d = new Date();
    // Use offset to get local YYYY-MM-DD regardless of browser timezone oddities
    const offset = d.getTimezoneOffset() * 60000; 
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const MOCK_VIDEOS: ExerciseVideo[] = [
    {
        id: '1',
        numero_orden: 1,
        titulo: 'Elevación de Talones',
        descripcion: 'Levanta los talones del suelo manteniendo las rodillas estiradas. Sostén 2 segundos arriba.',
        youtube_video_id: 'niPvW0w9F5w',
        tipo_ejercicio: 'Fuerza',
        grupos_musculares: ['Pantorrillas'],
        repeticiones_sugeridas: '3 series • 12 reps',
        equipamiento_necesario: ['Silla de apoyo'],
        nivel_dificultad: 'Baja',
        duracion_estimada_minutos: 5
    },
    {
        id: '2',
        numero_orden: 2,
        titulo: 'Sentadilla en Silla',
        descripcion: 'Siéntate y levántate de la silla sin usar las manos si es posible. Mantén la espalda recta.',
        youtube_video_id: 'tDfv96F6uBY',
        tipo_ejercicio: 'Fuerza',
        grupos_musculares: ['Cuádriceps', 'Glúteos'],
        repeticiones_sugeridas: '2 series • 10 reps',
        equipamiento_necesario: ['Silla estable'],
        nivel_dificultad: 'Media',
        duracion_estimada_minutos: 6
    },
    {
        id: '3',
        numero_orden: 3,
        titulo: 'Flexión de Rodilla de Pie',
        descripcion: 'De pie, lleva el talón hacia el glúteo doblando la rodilla. Alterna las piernas.',
        youtube_video_id: '_M2EtmeoJsw',
        tipo_ejercicio: 'Movilidad',
        grupos_musculares: ['Isquiotibiales'],
        repeticiones_sugeridas: '2 series • 10 por pierna',
        equipamiento_necesario: ['Silla de apoyo'],
        nivel_dificultad: 'Baja',
        duracion_estimada_minutos: 5
    },
    {
        id: '4',
        numero_orden: 4,
        titulo: 'Marcha en el Sitio',
        descripcion: 'Levanta las rodillas alternadamente simulando caminar, pero sin desplazarte.',
        youtube_video_id: '7L_6r3t3a_U',
        tipo_ejercicio: 'Aeróbico',
        grupos_musculares: ['Piernas', 'Cardio'],
        repeticiones_sugeridas: '1 serie • 3 minutos',
        equipamiento_necesario: [],
        nivel_dificultad: 'Media',
        duracion_estimada_minutos: 4
    }
];

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

  // --- GEMINI TEXT TO SPEECH ---
  generateTextToSpeech: async (text: string): Promise<string | null> => {
    try {
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
    
    // Fetch logs from Supabase
    const { data: logsData } = await supabase.from('exercise_logs').select('*');
    const allExerciseLogs: ExerciseSessionLog[] = logsData || [];
    
    // Fetch metrics
    const { data: metricsData } = await supabase.from('clinical_metrics').select('*');
    
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

        const pMetrics = metricsData?.find(m => m.patient_id === p.id);

        return {
            id: p.id,
            nombre: p.name,
            edad: p.age || 70,
            meta_pasos: p.dailyStepGoal || 4500,
            cumplimiento_semanal: weeklyCompliance,
            alerta: alerts.length > 0,
            ultimo_dolor_eva: lastEva,
            alertas: alerts,
            last_clinical_metrics: pMetrics || null
        };
    });
  },

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
    // 1. Fetch Logs
    const { data: logsData } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('patient_id', patientId);
    const logs: ExerciseSessionLog[] = logsData || [];
    
    // 2. Fetch Assignments Configuration
    const { data: assignData } = await supabase
        .from('assignments')
        .select('*')
        .eq('patient_id', patientId)
        .single();
    
    // Default assignment if none exists: All videos from DB
    // If DB is empty, fallback to MOCK_VIDEOS to ensure app works in prototype
    let allVideos = await storageService.getVideos();
    if (allVideos.length === 0) {
        allVideos = MOCK_VIDEOS;
    }
    
    let assignmentsIds = allVideos.map(v => v.id);
    let config = { series: 2, reps: 10, notes: "" };

    if (assignData) {
        // assignData.video_ids should be an array of strings in DB
        assignmentsIds = assignData.video_ids || [];
        if (assignData.config) {
            config = assignData.config;
        }
    }

    const today = getLocalDateString();
    
    // Filter videos
    const assignedVideos = allVideos.filter(v => assignmentsIds.includes(v.id));

    // MAP AND SORT
    const mapped = assignedVideos.map(video => {
        const todaysLog = logs.find(l => 
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

    return mapped.sort((a, b) => a.video.numero_orden - b.video.numero_orden);
  },

  logExerciseSession: async (log: ExerciseSessionLog): Promise<{success: boolean, message?: string}> => {
    const today = getLocalDateString();
    
    const logToSave = {
        patient_id: String(log.patient_id),
        video_id: String(log.video_id),
        fecha_realizacion: today, 
        timestamp: new Date().toISOString(),
        series_completadas: log.series_completadas,
        repeticiones_completadas: log.repeticiones_completadas,
        dificultad_percibida: log.dificultad_percibida,
        dolor_durante_ejercicio: log.dolor_durante_ejercicio,
        completado: true
    };

    const { error } = await supabase.from('exercise_logs').insert(logToSave);
    
    if (error) {
        console.error("Error logging session:", error);
        return { success: false, message: error.message };
    }
    
    return { success: true };
  },

  saveExerciseRoutine: async (patientId: string, videoIds: string[], config: any) => {
    // Upsert assignment config
    const { error } = await supabase.from('assignments').upsert({
        patient_id: patientId,
        video_ids: videoIds,
        config: config
    }, { onConflict: 'patient_id' });

    if (error) {
        console.error("Error saving routine:", error);
        return { success: false };
    }
    return { success: true };
  },

  updatePatientTreatment: async (patientId: string, stepGoal: number) => {
    await storageService.updatePatientField(patientId, 'dailyStepGoal', stepGoal);
    return { success: true };
  },

  getRoutineConfig: async (patientId: string) => {
    const { data } = await supabase
        .from('assignments')
        .select('config')
        .eq('patient_id', patientId)
        .single();
        
    return data ? data.config : null;
  },

  getPatientExerciseLogs: async (patientId: string): Promise<ExerciseSessionLog[]> => {
    const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false });

    if (error) return [];
    return data as ExerciseSessionLog[];
  },

  saveClinicalMetrics: async (patientId: string, metrics: ClinicalTrialMetrics) => {
    const { error } = await supabase.from('clinical_metrics').upsert({
        patient_id: patientId,
        ...metrics
    }, { onConflict: 'patient_id' });
    
    if (error) {
        console.error("Error saving metrics:", error);
        return { success: false };
    }
    return { success: true };
  },

  getClinicalMetrics: async (patientId: string): Promise<ClinicalTrialMetrics | null> => {
    const { data } = await supabase
        .from('clinical_metrics')
        .select('*')
        .eq('patient_id', patientId)
        .single();
    
    return data || null;
  }
};