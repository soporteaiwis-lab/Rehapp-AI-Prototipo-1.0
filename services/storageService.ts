import { Role, User, WalkSession } from '../types';

const USERS_KEY = 'rehapp_users_db';
const SESSION_KEY = 'rehapp_sessions';

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

// Helper to initialize DB
const initDB = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
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
  }
};