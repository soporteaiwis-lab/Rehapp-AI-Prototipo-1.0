import React, { useEffect, useState } from 'react';
import { User, WalkSession, ExerciseSessionLog } from '../types';
import { storageService } from '../services/storageService';
import { api, MOCK_VIDEOS, getLocalDateString } from '../services/api';

interface Props {
  user: User;
  setView: (view: string) => void;
}

export const PatientHome: React.FC<Props> = ({ user, setView }) => {
  const [sessions, setSessions] = useState<WalkSession[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseSessionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const walks = await storageService.getSessionsByPatient(user.id);
        const logs = await api.getPatientExerciseLogs(user.id);
        
        setSessions(walks);
        setExerciseLogs(logs);
        setLoading(false);
    };
    loadData();
  }, [user.id]);

  // --- DATA CALCULATIONS (REAL, NOT MOCKED) ---
  const today = getLocalDateString();
  
  // 1. Walking Data (Today)
  const todaysWalks = sessions.filter(s => s.date.startsWith(today));
  const stepsToday = todaysWalks.reduce((acc, curr) => acc + curr.steps, 0);
  const distanceToday = Math.floor(stepsToday * 0.7); // 0.7m per step approx
  const walkMinutesToday = Math.floor(todaysWalks.reduce((acc, curr) => acc + curr.durationSeconds, 0) / 60);

  // 2. Exercise Data (Today)
  const todaysExercises = exerciseLogs.filter(l => l.fecha_realizacion === today && l.completado);
  const exerciseMinutesToday = todaysExercises.reduce((acc, log) => {
      const vid = MOCK_VIDEOS.find(v => v.id === log.video_id);
      return acc + (vid?.duracion_estimada_minutos || 0);
  }, 0);

  // 3. Totals
  const totalMinutes = walkMinutesToday + exerciseMinutesToday;
  const stepGoal = user.dailyStepGoal || 4500;
  const timeGoal = 60; // 60 mins protocol

  // 4. List of completed videos for display
  const completedVideos = todaysExercises.map(log => {
      const vid = MOCK_VIDEOS.find(v => v.id === log.video_id);
      return vid ? vid.titulo : 'Ejercicio Desconocido';
  });

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando datos...</div>;

  return (
    <div className="space-y-6 pt-2">
      {/* Saludo Personalizado */}
      <h1 className="text-3xl font-extrabold text-gray-800">
        ¡Hola, {user.name.split(' ')[0]}! 👋
      </h1>

      {/* METRIC 1: TIEMPO TOTAL (VOLUMEN DE ENTRENAMIENTO) */}
      <div className="bg-white rounded-2xl p-6 shadow-md border-l-8 border-blue-600">
        <div className="flex justify-between items-start mb-2">
             <div className="text-4xl">⏱️</div>
             <div className="text-right">
                 <span className="text-3xl font-extrabold text-blue-900">{totalMinutes}</span>
                 <span className="text-sm font-bold text-gray-500"> / {timeGoal} min</span>
             </div>
        </div>
        <div className="text-lg text-gray-600 font-bold uppercase mb-2">Entrenamiento Hoy</div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden mb-2">
             <div 
                className="bg-blue-600 h-full transition-all duration-1000" 
                style={{ width: `${Math.min((totalMinutes/timeGoal)*100, 100)}%` }}
             ></div>
        </div>
        
        {/* Detail breakdown */}
        <div className="flex justify-between text-xs font-bold text-gray-400">
            <span>🚶 Caminata: {walkMinutesToday} min</span>
            <span>🏋️ Fuerza: {exerciseMinutesToday} min</span>
        </div>
      </div>

      {/* METRIC 2: PASOS */}
      <div className="card-metric">
        <div className="text-4xl mb-2">🚶</div>
        <div className="text-xl text-gray-500 font-bold uppercase">Pasos Hoy</div>
        <div className="valor-grande my-2">{stepsToday.toLocaleString()}</div>
        <div className="text-gray-400 font-semibold mb-3">Meta: {stepGoal.toLocaleString()}</div>
        <progress 
            className="w-full h-4 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:bg-green-500 [&::-moz-progress-bar]:bg-green-500" 
            value={stepsToday} 
            max={stepGoal}
        ></progress>
      </div>

      {/* METRIC 3: DISTANCIA */}
      <div className="card-metric flex flex-col items-center">
        <div className="text-4xl mb-2">📏</div>
        <div className="text-xl text-gray-500 font-bold uppercase">Distancia</div>
        <div className="valor-grande my-2">{distanceToday} m</div>
        <div className="text-gray-400 font-semibold">Estimado según pasos</div>
      </div>

      {/* SECTION: EJERCICIOS COMPLETADOS HOY */}
      {completedVideos.length > 0 && (
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100 shadow-sm animate-fade-in">
              <h3 className="font-bold text-green-800 text-lg mb-3 flex items-center gap-2">
                  <span>✅</span> Ejercicios Completados Hoy
              </h3>
              <ul className="space-y-2">
                  {completedVideos.map((title, idx) => (
                      <li key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
                          <span className="text-green-500 font-bold">✓</span>
                          <span className="text-gray-700 font-semibold text-sm">{title}</span>
                      </li>
                  ))}
              </ul>
          </div>
      )}

      {/* Botón Principal */}
      <button 
        id="btn-iniciar-caminata" 
        className="btn-gigante verde mt-4"
        onClick={() => setView('tracker')}
      >
        ▶️ INICIAR CAMINATA
      </button>

      {/* Botones Secundarios */}
      <div className="space-y-3 pt-2 pb-8">
        <button 
            className="btn-secundario flex items-center justify-center gap-2"
            onClick={() => setView('exercises')}
        >
            <span>📹</span> Ver Ejercicios
        </button>
        <button 
            className="btn-secundario flex items-center justify-center gap-2"
            onClick={() => setView('nutrition')}
        >
            <span>🥗</span> Consejos de Comida
        </button>
      </div>
    </div>
  );
};