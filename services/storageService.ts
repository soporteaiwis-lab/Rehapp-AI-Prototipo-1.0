import { Role, User, WalkSession, ExerciseVideo } from '../types';
import { supabase } from '../config/supabaseClient';

export const storageService = {
  // --- AUTH & USER MANAGEMENT ---

  login: async (identifier: string): Promise<User | undefined> => {
    // Para el prototipo, consultamos la tabla 'users' directamente
    // En producción usaríamos supabase.auth.signInWithPassword
    let query = supabase.from('users').select('*');
    
    if (identifier.includes('@')) {
        query = query.eq('email', identifier).eq('role', Role.DOCTOR);
    } else {
        query = query.eq('id', identifier).eq('role', Role.PATIENT);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) return undefined;

    return {
        id: data.id,
        name: data.nombre,
        role: data.role as Role,
        age: data.edad,
        condition: data.condicion,
        dailyStepGoal: data.meta_pasos_diaria
    };
  },

  getPatients: async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', Role.PATIENT);
        
    if (error) {
        console.error("Error fetching patients:", error);
        return [];
    }
    
    return data.map(u => ({
        id: u.id,
        name: u.nombre,
        role: Role.PATIENT,
        age: u.edad,
        condition: u.condicion,
        dailyStepGoal: u.meta_pasos_diaria
    }));
  },

  addPatient: async (patient: User): Promise<void> => {
    const { error } = await supabase.from('users').insert({
        id: patient.id,
        nombre: patient.name,
        role: Role.PATIENT,
        edad: patient.age,
        condicion: patient.condition,
        meta_pasos_diaria: 3000
    });
    if (error) throw error;
  },

  updatePatient: async (updatedPatient: User): Promise<void> => {
    const { error } = await supabase
        .from('users')
        .update({
            nombre: updatedPatient.name,
            edad: updatedPatient.age,
            condicion: updatedPatient.condition
        })
        .eq('id', updatedPatient.id);
    if (error) throw error;
  },

  updatePatientField: async (userId: string, field: keyof User, value: any): Promise<void> => {
    // Map Frontend field names to DB column names
    const dbFieldMap: any = {
        'dailyStepGoal': 'meta_pasos_diaria',
        'name': 'nombre',
        'age': 'edad'
    };
    
    const dbField = dbFieldMap[field] || field;

    const { error } = await supabase
        .from('users')
        .update({ [dbField]: value })
        .eq('id', userId);
        
    if (error) console.error("Error updating field:", error);
  },

  deletePatient: async (id: string): Promise<void> => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.error("Error deleting patient:", error);
  },

  // --- SESSIONS (WALKING) ---

  saveSession: async (session: WalkSession): Promise<void> => {
    const { error } = await supabase.from('walk_sessions').insert({
        patient_id: session.patientId,
        date: session.date,
        duration_seconds: session.durationSeconds,
        steps: session.steps,
        pain_level: session.painLevel,
        stopped_due_to_pain: session.stoppedDueToPain
    });
    if (error) console.error("Error saving session:", error);
  },

  getSessions: async (): Promise<WalkSession[]> => {
    const { data, error } = await supabase.from('walk_sessions').select('*');
    if (error) return [];
    
    return data.map(s => ({
        id: s.id,
        patientId: s.patient_id,
        date: s.date,
        durationSeconds: s.duration_seconds,
        steps: s.steps,
        painLevel: s.pain_level,
        stoppedDueToPain: s.stopped_due_to_pain
    }));
  },

  getSessionsByPatient: async (patientId: string): Promise<WalkSession[]> => {
    const { data, error } = await supabase
        .from('walk_sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });
        
    if (error) return [];
    
    return data.map(s => ({
        id: s.id,
        patientId: s.patient_id,
        date: s.date,
        durationSeconds: s.duration_seconds,
        steps: s.steps,
        painLevel: s.pain_level,
        stoppedDueToPain: s.stopped_due_to_pain
    }));
  },

  // --- VIDEO MANAGEMENT ---
  
  getVideos: async (): Promise<ExerciseVideo[]> => {
    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('numero_orden', { ascending: true });
        
    if (error) {
        console.error("Error fetching videos:", error);
        return [];
    }
    return data as ExerciseVideo[];
  },

  saveVideo: async (video: ExerciseVideo): Promise<void> => {
    // Upsert (Insert or Update based on ID)
    const { error } = await supabase
        .from('videos')
        .upsert(video);
        
    if (error) console.error("Error saving video:", error);
  },

  deleteVideo: async (id: string): Promise<void> => {
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) console.error("Error deleting video:", error);
  }
};