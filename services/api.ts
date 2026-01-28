import { GoogleGenAI, SchemaType } from "@google/genai";
import { User, Role, WalkSession, PainResponse, Recipe, PatientSummary, PAIN_THRESHOLD_ALERT } from '../types';
import { storageService } from './storageService';

// Initialize Gemini
// Note: In a real production app, this call happens on the Node.js server, not the client.
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-3-flash-preview';

/**
 * API SERVICE LAYER
 * Mimics the requested REST Endpoints.
 */
export const api = {

  /**
   * ENDPOINT 1: POST /api/activity/start
   */
  startActivity: async (patientId: string, tipoActividad: string) => {
    // Simulate server latency
    await new Promise(r => setTimeout(r, 500));

    return {
      session_id: Date.now().toString(),
      meta_pasos: 4500, // This would come from treatment_plans table
      mensaje_inicio: "¡Excelente! Comienza a caminar a ritmo cómodo. Mantén la respiración constante."
    };
  },

  /**
   * ENDPOINT 2: POST /api/activity/report-pain
   * Includes Critical Logic validated by Gemini (conceptually)
   */
  reportPain: async (sessionId: string, nivelEva: number): Promise<PainResponse> => {
    // 1. Strict Deterministic Logic (The "Reglas de Oro")
    if (nivelEva >= 8) {
        // We log the event internally
        console.log(`CRITICAL PAIN EVENT: Session ${sessionId}, EVA ${nivelEva}`);
        
        return {
            accion: "ALTO_INMEDIATO",
            mensaje: "🛑 DESCANSA AHORA. El dolor es demasiado alto. No continúes hasta que el dolor desaparezca completamente.",
            bloquear_app: true
        };
    } 
    
    if (nivelEva >= 5) {
        return {
            accion: "PRECAUCION",
            mensaje: "⚠️ Reduce la velocidad ahora. Respira profundo. Si el dolor aumenta, detente.",
            bloquear_app: false
        };
    }

    // 2. For low pain, we can ask Gemini for a motivational message (Optional, kept simple for speed)
    return {
        accion: "CONTINUAR",
        mensaje: "👍 Vas muy bien. Mantén el ritmo suave.",
        bloquear_app: false
    };
  },

  /**
   * ENDPOINT 3: POST /api/ai/nutrition
   * Generates PAD-specific recipes using Gemini
   */
  generateNutritionPlan: async (ingredientes: string[], restricciones: string): Promise<Recipe | null> => {
    try {
      const prompt = `
        Eres un nutricionista experto en salud cardiovascular y geriatría.
        El paciente tiene Enfermedad Arterial Periférica (EAP).
        
        Ingredientes disponibles: ${ingredientes.join(', ')}.
        Restricciones: ${restricciones}.

        Genera una receta saludable en formato JSON estricto con la siguiente estructura:
        {
          "nombre": "Nombre del plato",
          "beneficios": "Explicación breve de por qué ayuda a la circulación",
          "ingredientes": ["lista", "de", "cantidades"],
          "preparacion": ["paso 1", "paso 2"]
        }
      `;

      const result = await genAI.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
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

  /**
   * ENDPOINT 4: GET /api/doctor/dashboard/:doctor_id
   * Aggregates data and creates alerts
   */
  getDoctorDashboard: async (doctorId: string): Promise<PatientSummary[]> => {
    const patients = await storageService.getPatients();
    const allSessions = await storageService.getSessions();
    
    // Logic to summarize per patient
    return patients.map(p => {
        const pSessions = allSessions.filter(s => s.patientId === p.id);
        
        // Logic: < 3 sessions last week (Simulated by just counting total for prototype)
        const weeklyCompliance = pSessions.length; 
        
        // Logic: Last 2 sessions had High Pain?
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
            meta_pasos: 4500, // Mock from plan
            cumplimiento_semanal: weeklyCompliance,
            alerta: alerts.length > 0,
            ultimo_dolor_eva: lastEva,
            alertas: alerts
        };
    });
  }
};