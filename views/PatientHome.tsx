import React, { useEffect, useState } from 'react';
import { User, WalkSession } from '../types';
import { storageService } from '../services/storageService';

interface Props {
  user: User;
  setView: (view: string) => void;
}

export const PatientHome: React.FC<Props> = ({ user, setView }) => {
  const [sessions, setSessions] = useState<WalkSession[]>([]);

  useEffect(() => {
    storageService.getSessionsByPatient(user.id).then(setSessions);
  }, [user.id]);

  const totalSteps = sessions.reduce((acc, curr) => acc + curr.steps, 0);
  const goal = 4500;
  
  // Simple calculation for distance (steps * 0.7m avg stride)
  const totalDistance = Math.floor(totalSteps * 0.7);
  const goalDistance = 3000;

  return (
    <div className="space-y-6 pt-2">
      {/* Saludo Personalizado */}
      <h1 className="text-3xl font-extrabold text-gray-800">
        ¡Hola, {user.name.split(' ')[0]}! 👋
      </h1>

      {/* Tarjeta Pasos */}
      <div className="card-metric">
        <div className="text-4xl mb-2">🚶</div>
        <div className="text-xl text-gray-500 font-bold uppercase">Pasos Hoy</div>
        <div className="valor-grande my-2">{totalSteps.toLocaleString()}</div>
        <div className="text-gray-400 font-semibold mb-3">Meta: {goal.toLocaleString()}</div>
        <progress 
            className="w-full h-4 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:bg-green-500 [&::-moz-progress-bar]:bg-green-500" 
            value={totalSteps} 
            max={goal}
        ></progress>
      </div>

      {/* Tarjeta Distancia */}
      <div className="card-metric flex flex-col items-center">
        <div className="text-4xl mb-2">📏</div>
        <div className="text-xl text-gray-500 font-bold uppercase">Distancia</div>
        <div className="valor-grande my-2">{totalDistance} m</div>
        <div className="text-gray-400 font-semibold">Meta: {goalDistance} m</div>
      </div>

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
        <button className="btn-secundario flex items-center justify-center gap-2">
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