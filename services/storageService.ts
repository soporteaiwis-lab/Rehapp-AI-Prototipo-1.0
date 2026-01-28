import { Role, User, WalkSession, ExerciseVideo } from '../types';

const USERS_KEY = 'rehapp_users_db';
const SESSION_KEY = 'rehapp_sessions';
const VIDEOS_KEY = 'rehapp_videos_db';

/*
  ADVERTENCIA IMPORTANTE PARA EL USUARIO:
  Este servicio utiliza 'localStorage'. Los datos se guardan SOLO en el dispositivo actual.
  Si ingresa en el celular, no verá los datos del PC y viceversa.
  Para sincronización real, se debe configurar la conexión a Supabase en 'supabase-config.js'.
*/

// 1. Initial Seed Data (Only used if DB is empty)
const INITIAL_USERS: User[] = [
  { id: '12345678', name: 'Paciente Pruebas', role: Role.PATIENT, age: 75, condition: 'EAP Moderada', dailyStepGoal: 4500 },
  { id: '002', name: 'Juan Pérez (78 años)', role: Role.PATIENT, age: 78, condition: 'EAP Severa', dailyStepGoal: 3000 },
  { id: '003', name: 'Maria González (72 años)', role: Role.PATIENT, age: 72, condition: 'EAP Moderada', dailyStepGoal: 5000 },
  { id: 'd1', name: 'Dr. Silva (Kinesiólogo)', role: Role.DOCTOR, email: 'medico@test.com' },
];

const INITIAL_VIDEOS: ExerciseVideo[] = [
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

// Helper to initialize DB
const initDB = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(VIDEOS_KEY)) {
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(INITIAL_VIDEOS));
  }
};

export const storageService = {
  // --- AUTH & USER MANAGEMENT ---

  login: async (identifier: string): Promise<User | undefined> => {
    initDB();
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    // Check if doctor email
    if (identifier.includes('@')) {
         return users.find(u => u.role === Role.DOCTOR);
    }
    // Check patient ID (RUT)
    return users.find(u => u.id === identifier && u.role === Role.PATIENT);
  },

  getPatients: async (): Promise<User[]> => {
    initDB();
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return users.filter(u => u.role === Role.PATIENT);
  },

  addPatient: async (patient: User): Promise<void> => {
    initDB();
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    if (users.some(u => u.id === patient.id)) {
        throw new Error("El ID/RUT ya existe.");
    }
    
    // Default goal for new patients
    users.push({ ...patient, role: Role.PATIENT, dailyStepGoal: 3000 });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  updatePatient: async (updatedPatient: User): Promise<void> => {
    initDB();
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const index = users.findIndex(u => u.id === updatedPatient.id);
    
    if (index !== -1) {
        users[index] = { ...users[index], ...updatedPatient };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  // Specific method to update a single field without needing the whole user object
  updatePatientField: async (userId: string, field: keyof User, value: any): Promise<void> => {
    initDB();
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const index = users.findIndex(u => u.id === userId);
    
    if (index !== -1) {
        users[index] = { ...users[index], [field]: value };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  deletePatient: async (id: string): Promise<void> => {
    initDB();
    let users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    users = users.filter(u => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  // --- SESSIONS (WALKING) ---

  saveSession: async (session: WalkSession): Promise<void> => {
    const existing = await storageService.getSessions();
    const updated = [session, ...existing];
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  },

  getSessions: async (): Promise<WalkSession[]> => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : [];
  },

  getSessionsByPatient: async (patientId: string): Promise<WalkSession[]> => {
    const all = await storageService.getSessions();
    return all.filter(s => s.patientId === patientId);
  },

  // --- VIDEO MANAGEMENT ---
  
  getVideos: async (): Promise<ExerciseVideo[]> => {
    initDB();
    const data = localStorage.getItem(VIDEOS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveVideo: async (video: ExerciseVideo): Promise<void> => {
    initDB();
    const videos = await storageService.getVideos();
    const index = videos.findIndex(v => v.id === video.id);
    if (index >= 0) {
        videos[index] = video;
    } else {
        videos.push(video);
    }
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
  },

  deleteVideo: async (id: string): Promise<void> => {
    initDB();
    let videos = await storageService.getVideos();
    videos = videos.filter(v => v.id !== id);
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
  }
};