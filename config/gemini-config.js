// Configuration for Google Gemini API
const GEMINI_API_KEY = process.env.API_KEY || 'INSERT_YOUR_GEMINI_API_KEY_HERE';

// Using the latest preview model as per best practices (replacing older models)
const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Sends a prompt to Gemini via direct REST API fetch.
 * Useful for lightweight integrations where the full SDK isn't available or for simple edge functions.
 * 
 * @param {string} prompt - The text prompt to send.
 * @returns {Promise<Object>} - The JSON response from the API.
 */
export async function consultarGemini(prompt) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        // Optional: Safety settings and generation config can be added here
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error en consultarGemini:", error);
    return null;
  }
}