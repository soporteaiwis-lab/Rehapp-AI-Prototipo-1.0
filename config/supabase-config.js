import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuration - In production, use environment variables (process.env.SUPABASE_URL)
// For this prototype, replace the strings below with your actual Supabase credentials.
const supabaseUrl = process.env.SUPABASE_URL || 'INSERT_YOUR_SUPABASE_URL_HERE';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'INSERT_YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Registers a new activity log entry in the database.
 * @param {Object} data - The activity data (patient_id, tipo_actividad, etc.)
 */
export async function registrarActividad(datos) {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert([datos])
    .select();
    
  if (error) {
    console.error('Supabase Error:', error);
    return { data: null, error };
  }
  return { data, error: null };
}

/**
 * Fetches the clinical profile for a specific user.
 * @param {string} userId 
 */
export async function obtenerPerfilClinico(userId) {
  const { data, error } = await supabase
    .from('clinical_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { data, error };
}