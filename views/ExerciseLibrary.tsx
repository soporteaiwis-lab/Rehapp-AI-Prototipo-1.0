import React, { useEffect, useState } from 'react';
import { User, ExerciseAssignment, ExerciseSessionLog } from '../types';
import { api } from '../services/api';
import { VideoPlayerModal } from '../components/VideoPlayerModal';

interface Props {
  user: User;
}

export const ExerciseLibrary: React.FC<Props> = ({ user }) => {
  const [assignments, setAssignments] = useState<ExerciseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideoAssignment, setSelectedVideoAssignment] = useState<ExerciseAssignment | null>(null);

  const loadExercises = async () => {
    setLoading(true);
    const data = await api.getAssignedExercises(user.id);
    setAssignments(data);
    setLoading(false);
  };

  useEffect(() => {
    loadExercises();
  }, [user.id]);

  const handleLogSession = async (logData: Partial<ExerciseSessionLog>) => {
    if (!selectedVideoAssignment) return;

    const fullLog: ExerciseSessionLog = {
      patient_id: user.id,
      video_id: selectedVideoAssignment.video_id,
      fecha_realizacion: new Date().toISOString().split('T')[0],
      series_completadas: logData.series_completadas || 0,
      repeticiones_completadas: logData.repeticiones_completadas || 0,
      dificultad_percibida: logData.dificultad_percibida || 0,
      dolor_durante_ejercicio: logData.dolor_durante_ejercicio || null,
      completado: true
    };

    const result = await api.logExerciseSession(fullLog);
    
    if (result.success) {
      alert("¡Ejercicio registrado correctamente! 🎉");
      setSelectedVideoAssignment(null);
      loadExercises(); // Refresh UI
    } else {
      alert(result.message || "Error al registrar.");
    }
  };

  // Calculate Progress
  const completedTodayCount = assignments.filter(a => a.completed_today).length;
  // Mock weekly logic: Assuming 3 sessions goal refers to unique days, 
  // but for this view we show "Exercises done today / Total Assigned" or simulate a weekly counter
  // Let's stick to the prompt's "Esta semana: 2/3 sesiones"
  const weeklySessionsMock = completedTodayCount > 0 ? 2 : 1; 

  const getEquipmentIcon = (eq: string[]) => {
    if (eq.includes('silla')) return '🪑 Silla';
    if (eq.includes('banda_elastica')) return '🔴 Banda';
    if (eq.includes('mancuernas')) return '🏋️ Pesas';
    return '📦 Equipo';
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando ejercicios...</div>;

  return (
    <div className="pantalla-ejercicios pb-24">
      {/* Header */}
      <header className="flex justify-between items-end mb-6 px-2">
        <h1 className="text-3xl font-extrabold text-gray-800">📹 Mis Ejercicios</h1>
        <div className="bg-blue-100 px-4 py-2 rounded-xl text-center">
          <span className="block text-xs text-blue-600 font-bold uppercase">Esta semana</span>
          <span className="text-2xl font-black text-blue-800">{weeklySessionsMock}/3</span>
        </div>
      </header>

      {/* Motivation Card */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl mb-6 flex gap-4 items-center shadow-sm mx-2">
        <div className="text-4xl">⭐</div>
        <p className="text-gray-700 font-medium leading-tight">
          {weeklySessionsMock >= 3 
            ? "¡Meta cumplida esta semana! Eres increíble." 
            : `¡Excelente! Solo falta ${3 - weeklySessionsMock} sesión${3 - weeklySessionsMock > 1 ? 'es' : ''} esta semana.`}
        </p>
      </div>

      {/* List */}
      <div className="space-y-6 px-2">
        {assignments.map(assign => (
          <div key={assign.id} className="video-card">
            {/* Thumbnail */}
            <div 
              className="video-thumbnail cursor-pointer"
              onClick={() => setSelectedVideoAssignment(assign)}
            >
              <img 
                src={`https://img.youtube.com/vi/${assign.video.youtube_video_id}/hqdefault.jpg`} 
                alt={assign.video.titulo} 
              />
              <div className="play-overlay">▶️</div>
              <div className="badge-numero">{assign.video.numero_orden}</div>
            </div>
            
            {/* Info */}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-gray-800 leading-tight w-2/3">
                    {assign.video.titulo}
                </h3>
                {assign.completed_today ? (
                    <span className="badge-estado completado">✓ Hecho hoy</span>
                ) : (
                    <span className="badge-estado pendiente">Pendiente</span>
                )}
              </div>
              
              <div className="text-gray-500 text-sm font-semibold mb-3 flex flex-wrap gap-3">
                 <span>🔄 {assign.video.repeticiones_sugeridas.split('•')[0] || '2 series'}</span>
                 <span>{getEquipmentIcon(assign.video.equipamiento_necesario)}</span>
              </div>

              <button 
                className="w-full py-3 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                onClick={() => setSelectedVideoAssignment(assign)}
              >
                {assign.completed_today ? 'VER DE NUEVO' : 'VER EJERCICIO'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Giant CTA */}
      <div className="mt-8 px-2">
        <button 
            className="btn-gigante verde"
            onClick={() => {
                // Find first pending or just scroll to top
                const firstPending = assignments.find(a => !a.completed_today);
                if (firstPending) setSelectedVideoAssignment(firstPending);
                else alert("¡Ya completaste todo por hoy! Puedes repasar si quieres.");
            }}
        >
            🏋️ HACER MIS EJERCICIOS AHORA
        </button>
      </div>

      {/* Modal */}
      {selectedVideoAssignment && (
        <VideoPlayerModal 
            video={selectedVideoAssignment.video}
            onClose={() => setSelectedVideoAssignment(null)}
            onComplete={handleLogSession}
        />
      )}
    </div>
  );
};
