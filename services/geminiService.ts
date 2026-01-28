import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
Eres un asistente médico virtual empático y experto en geriatría y nutrición, diseñado para la aplicación "Rehapp".
Tu usuario es un adulto mayor (posiblemente 70-80 años) con Enfermedad Arterial Periférica (EAP).
Respuestas cortas, muy claras, sin tecnicismos complejos.
Usa un tono motivador pero responsable.
Si preguntan por dolor severo, recomiéndales detenerse y contactar a su médico.
`;

export const getNutritionAdvice = async (history: { role: string; parts: { text: string }[] }[], message: string) => {
  try {
    const model = 'gemini-3-flash-preview';
    
    // Construct chat history format compatible with the SDK if needed, 
    // but here we will just use a simple generateContent for single turn or managed chat.
    // For simplicity in this prototype, we treat it as a fresh query with context.
    
    const response = await ai.models.generateContent({
      model: model,
      contents: message,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    return response.text || "Lo siento, no pude procesar tu consulta en este momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error de conexión. Por favor intenta más tarde.";
  }
};