import { Role, User, WalkSession } from '../types';

const USERS_KEY = 'rehapp_users_db';
const SESSION_KEY = 'rehapp_sessions';

// 1. Initial Seed Data (Only used if DB is empty)
const INITIAL_USERS: User[] = [
  { id: '12345678', name: 'Paciente Pruebas', role: Role.PATIENT, age: 75, condition: 'EAP Moderada' },
  { id: '002', name: 'Juan Pérez (78 años)', role: Role.PATIENT, age: 78, condition: 'EAP Severa' },
  { id: '003', name: 'Maria González (72 años)', role: Role.PATIENT, age: 72, condition: 'EAP Moderada' },
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
    
    users.push({ ...patient, role: Role.PATIENT });
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