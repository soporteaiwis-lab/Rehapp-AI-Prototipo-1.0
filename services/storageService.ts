import { Role, User, WalkSession } from '../types';

// Mock Data
const MOCK_USERS: User[] = [
  { id: 'p1', name: 'Juan Pérez (78 años)', role: Role.PATIENT, age: 78, condition: 'EAP Severa' },
  { id: 'p2', name: 'Maria González (72 años)', role: Role.PATIENT, age: 72, condition: 'EAP Moderada' },
  { id: 'd1', name: 'Dr. Silva (Kinesiólogo)', role: Role.DOCTOR },
];

const SESSION_KEY = 'rehapp_sessions';

export const storageService = {
  // Simulate Auth
  login: async (role: Role): Promise<User> => {
    // Return first user of that role for prototype simplicity
    return MOCK_USERS.find(u => u.role === role) || MOCK_USERS[0];
  },

  getPatients: async (): Promise<User[]> => {
    return MOCK_USERS.filter(u => u.role === Role.PATIENT);
  },

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