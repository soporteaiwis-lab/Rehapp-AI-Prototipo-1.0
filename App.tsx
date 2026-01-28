import React, { useState } from 'react';
import { User, Role } from './types';
import { storageService } from './services/storageService';
import { Layout } from './components/Layout';

// Views
import { PatientHome } from './views/PatientHome';
import { WalkSession } from './views/WalkSession';
import { Nutrition } from './views/Nutrition';
import { DoctorDashboard } from './views/DoctorDashboard';
import { ExerciseLibrary } from './views/ExerciseLibrary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<string>('home'); 
  const [loading, setLoading] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Mock Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate finding user based on email (prototype logic)
    const role = email.includes('medico') ? Role.DOCTOR : Role.PATIENT;
    
    setTimeout(async () => {
      const u = await storageService.login(role);
      setUser(u);
      setView('home');
      setLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setUser(null);
    setView('home');
    setEmail('');
    setPassword('');
  };

  // PANTALLA 1: LOGIN
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center p-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">💙</div>
          <h1 className="text-4xl font-extrabold text-blue-900 mb-2">Rehapp</h1>
          <p className="text-xl text-gray-500">Ingreso de Pacientes</p>
        </div>

        <form onSubmit={handleLogin} className="w-full max-w-md mx-auto">
          <label className="block text-lg font-bold text-gray-700 mb-2">Correo Electrónico</label>
          <input 
            type="email" 
            className="input-grande"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="block text-lg font-bold text-gray-700 mb-2">Contraseña</label>
          <input 
            type="password" 
            className="input-grande"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button 
            type="submit"
            className="w-full h-[80px] bg-blue-600 text-white text-2xl font-bold rounded-xl mt-4 shadow-lg active:scale-95 transition-transform"
            disabled={loading}
          >
            {loading ? 'INGRESANDO...' : 'INGRESAR'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-lg">¿Olvidó su contraseña?</p>
          <button 
             onClick={() => { setEmail('medico@test.com'); }}
             className="text-sm text-gray-300 mt-10 underline"
          >
            Acceso Médico (Demo)
          </button>
        </div>
      </div>
    );
  }

  // Authenticated View
  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      currentView={view} 
      setView={setView}
    >
      {user.role === Role.DOCTOR ? (
        <DoctorDashboard />
      ) : (
        <>
          {view === 'home' && <PatientHome user={user} setView={setView} />}
          {view === 'tracker' && (
            <WalkSession user={user} onFinish={() => setView('home')} />
          )}
          {view === 'exercises' && <ExerciseLibrary user={user} />}
          {view === 'nutrition' && <Nutrition />}
        </>
      )}
    </Layout>
  );
}