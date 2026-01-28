import { Role, User, WalkSession, ExerciseVideo } from '../types';

const USERS_KEY = 'rehapp_users_db';
const SESSION_KEY = 'rehapp_sessions';
const VIDEOS_KEY = 'rehapp_videos_db';

// 1. Initial Seed Data (Only used if DB is empty)
const INITIAL_USERS: User[] = [
  { id: '12345678', name: 'Paciente Pruebas', role: Role.PATIENT, age: 75, condition: 'EAP Moderada', dailyStepGoal: 4500 },
  { id: '002', name: 'Juan Pérez (78 años)', role: Role.PATIENT, age: 78, condition: 'EAP Severa', dailyStepGoal: 3000 },
  { id: '003', name: 'Maria González (72 años)', role: Role.PATIENT, age: 72, condition: 'EAP Moderada', dailyStepGoal: 5000 },
  { id: 'd1', name: 'Dr. Silva (Kinesiólogo)', role: Role.DOCTOR, email: 'medico@test.com' },
];

const INITIAL_VIDEOS: ExerciseVideo[] = [
  { 
    id: 'v1', numero_orden: 1, titulo: 'Variante Pararse y Sentarse', descripcion: 'Ejercicio fundamental para fortalecer piernas y glúteos de forma segura.', 
    youtube_video_id: 'O7oFiCMN25E', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps', 'gluteos'], 
    repeticiones_sugeridas: '2-3 series • 8-15 reps', equipamiento_necesario: ['silla'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 5 
  },
  { 
    id: 'v2', numero_orden: 2, titulo: 'Remo con Banda Elástica', descripcion: 'Fortalecimiento de espalda para mejorar postura.', 
    youtube_video_id: 'J3VFboUbubo', tipo_ejercicio: 'resistencia', grupos_musculares: ['dorsal', 'trapecio'], 
    repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica'], nivel_dificultad: 'intermedio', duracion_estimada_minutos: 6 
  },
  { 
    id: 'v3', numero_orden: 3, titulo: 'Pararse y Sentarse', descripcion: 'Ejercicio funcional clásico sin apoyo de brazos si es posible.', 
    youtube_video_id: 'gWdgSzPrncU', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps'], 
    repeticiones_sugeridas: '2-3 series • 8-12 reps', equipamiento_necesario: ['silla'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 5 
  },
  { 
    id: 'v4', numero_orden: 4, titulo: 'Extensión de Glúteo (V1)', descripcion: 'Fortalecimiento de la cadera posterior.', 
    youtube_video_id: 'G00dG-33QqA', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['gluteos'], 
    repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica', 'silla'], nivel_dificultad: 'intermedio', duracion_estimada_minutos: 4 
  },
  { 
    id: 'v5', numero_orden: 5, titulo: 'Extensión de Glúteo (V2)', descripcion: 'Variante enfocada en control muscular.', 
    youtube_video_id: 'pX7DEPwYXEE', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['gluteos', 'cuadriceps'], 
    repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica', 'silla'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 4 
  },
  { 
    id: 'v6', numero_orden: 6, titulo: 'Extensión de Cuádriceps', descripcion: 'Fortalecimiento de muslos con peso adicional.', 
    youtube_video_id: 'zEa1Eq3yIsw', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['cuadriceps'], 
    repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['tobilleras', 'silla'], nivel_dificultad: 'intermedio', duracion_estimada_minutos: 5 
  },
  { 
    id: 'v7', numero_orden: 7, titulo: 'Elevación de Talones', descripcion: 'Clave para el retorno venoso y fuerza de pantorrillas.', 
    youtube_video_id: '0caP82ZUo1I', tipo_ejercicio: 'fuerza_eeii', grupos_musculares: ['pantorrillas'], 
    repeticiones_sugeridas: '2-3 series • 15-20 reps', equipamiento_necesario: ['silla'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 3 
  },
  { 
    id: 'v8', numero_orden: 8, titulo: 'Curl Bíceps (flexión de codo)', descripcion: 'Fortalecimiento de brazos para actividades diarias.', 
    youtube_video_id: '-FNnffnCPxE', tipo_ejercicio: 'resistencia', grupos_musculares: ['biceps'], 
    repeticiones_sugeridas: '2-3 series • 10-15 reps', equipamiento_necesario: ['banda_elastica', 'mancuernas'], nivel_dificultad: 'principiante', duracion_estimada_minutos: 4 
  },
];

// Helper to initialize DB
const initDB = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  }
  // Initialize Videos if not exist
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

  // --- VIDEO LIBRARY MANAGEMENT ---

  getVideos: async (): Promise<ExerciseVideo[]> => {
    initDB();
    const data = localStorage.getItem(VIDEOS_KEY);
    const videos: ExerciseVideo[] = data ? JSON.parse(data) : [];
    return videos.sort((a, b) => a.numero_orden - b.numero_orden);
  },

  saveVideo: async (video: ExerciseVideo): Promise<void> => {
    initDB();
    let videos: ExerciseVideo[] = JSON.parse(localStorage.getItem(VIDEOS_KEY) || '[]');
    
    // Check if updating or adding
    const index = videos.findIndex(v => v.id === video.id);
    if (index !== -1) {
        videos[index] = video;
    } else {
        videos.push(video);
    }
    
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
  },

  deleteVideo: async (videoId: string): Promise<void> => {
    initDB();
    let videos: ExerciseVideo[] = JSON.parse(localStorage.getItem(VIDEOS_KEY) || '[]');
    videos = videos.filter(v => v.id !== videoId);
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
  }
};