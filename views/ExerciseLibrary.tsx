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
    // Only show full loading spinner on initial mount, not on refreshes
    if (assignments.length === 0) setLoading(true);
    
    try {
      const data = await api.getAssignedExercises(user.id);
      setAssignments(data);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, [user.id]);

  const handleLogSession = async (logData: Partial<ExerciseSessionLog>) => {
    if (!selectedVideoAssignment) return;

    const fullLog: ExerciseSessionLog = {
      patient_id: user.id,
      video_id: selectedVideoAssignment.video_id,
      fecha_realizacion: '', // Will be filled by API to ensure server consistency
      timestamp: new Date().toISOString(),
      series_completadas: logData.series_completadas || 0,
      repeticiones_completadas: logData.repeticiones_completadas || 0,
      dificultad_percibida: logData.dificultad_percibida || 0,
      dolor_durante_ejercicio: logData.dolor_durante_ejercicio || null,
      completado: true
    };

    // --- ACTUALIZACIÓN OPTIMISTA (UI Inmediata) ---
    // Cambiamos el estado visualmente AHORA, sin esperar a la base de datos
    const videoId = selectedVideoAssignment.video_id;
    const now = new Date().toISOString();
    
    setAssignments(prevAssignments => 
      prevAssignments.map(assign => 
        assign.video_id === videoId 
          ? { 
              ...assign, 
              completed_today: true,
              last_completed_at: now 
            } 
          : assign
      )
    );

    // Cerramos el modal inmediatamente para fluidez
    setSelectedVideoAssignment(null);

    // --- GUARDADO EN SEGUNDO PLANO ---
    try {
      const result = await api.logExerciseSession(fullLog);
      
      if (result.success) {
        // Opcional: Feedback sutil o silencioso
        // Recargamos datos reales para asegurar sincronización con servidor
        await loadExercises();
      } else {
        // Si falló el guardado real, revertimos el cambio visual y avisamos
        alert(result.message || "Error al guardar el progreso.");
        await loadExercises(); 
      }
    } catch (error) {
      console.error('Error logging session:', error);
      alert("Error de conexión. Se intentará guardar nuevamente.");
      await loadExercises();
    }
  };

  // Calculate Real Progress
  const totalAssigned = assignments.length;
  const completedTodayCount = assignments.filter(a => a.completed_today).length;
  const progressPercentage = totalAssigned > 0 ? (completedTodayCount / totalAssigned) * 100 : 0;

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
      <header className="flex justify-between items-end mb-6 px-2 pt-4">
        <h1 className="text-3xl font-extrabold text-gray-800">🎬 Mis Ejercicios</h1>
        <div className="bg-blue-100 px-4 py-2 rounded-xl text-center">
          <span className="block text-xs text-blue-600 font-bold uppercase">Progreso Hoy</span>
          <span className="text-2xl font-black text-blue-800">{completedTodayCount}/{totalAssigned}</span>
        </div>
      </header>

      {/* Progress Bar & Motivation */}
      <div className="bg-white p-4 rounded-xl shadow-sm mx-2 mb-6 border border-gray-100">
         <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div 
                className="bg-green-500 h-4 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }}
            ></div>
         </div>
         <p className="text-gray-600 font-medium text-sm text-center">
            {completedTodayCount === totalAssigned 
                ? "¡Excelente! Has completado todo por hoy. 🌟" 
                : `Has completado ${completedTodayCount} de ${totalAssigned} ejercicios.`
            }
         </p>
      </div>

      {/* List */}
      <div className="space-y-6 px-2">
        {assignments.map(assign => (
          <div key={assign.id} className={`video-card ${assign.completed_today ? 'opacity-80 bg-gray-50' : 'bg-white'}`}>
            {/* Thumbnail */}
            <div 
              className="video-thumbnail cursor-pointer"
              onClick={() => setSelectedVideoAssignment(assign)}
            >
              <img 
                src={`https://img.youtube.com/vi/${assign.video.youtube_video_id}/hqdefault.jpg`} 
                alt={assign.video.titulo} 
                className={assign.completed_today ? "grayscale" : ""}
              />
              <div className="play-overlay">▶️</div>
              <div className="badge-numero">{assign.video.numero_orden}</div>
              {assign.completed_today && (
                  <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                      <span className="text-white text-6xl font-bold drop-shadow-lg">✓</span>
                  </div>
              )}
            </div>
            
            {/* Info */}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-gray-800 leading-tight w-2/3">
                    {assign.video.titulo}
                </h3>
                {assign.completed_today ? (
                    <span className="badge-estado completado">✓ Completado</span>
                ) : (
                    <span className="badge-estado pendiente">Pendiente</span>
                )}
              </div>
              
              <div className="text-gray-500 text-sm font-semibold mb-3 flex flex-wrap gap-3">
                 <span>🔄 {assign.video.repeticiones_sugeridas.split('•')[0] || '2 series'}</span>
                 <span>{getEquipmentIcon(assign.video.equipamiento_necesario)}</span>
              </div>
              
              {assign.last_completed_at && (
                  <div className="text-xs text-gray-400 mb-2">
                      Realizado a las: {new Date(assign.last_completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
              )}

              <button 
                className={`w-full py-3 font-bold rounded-lg border transition-colors ${
                    assign.completed_today 
                    ? "bg-gray-100 text-gray-500 border-gray-300" 
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                }`}
                onClick={() => setSelectedVideoAssignment(assign)}
              >
                {assign.completed_today ? 'VER DE NUEVO' : 'VER EJERCICIO'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Giant CTA */}
      {completedTodayCount < totalAssigned && (
        <div className="mt-8 px-2">
            <button 
                className="btn-gigante verde"
                onClick={() => {
                    const firstPending = assignments.find(a => !a.completed_today);
                    if (firstPending) setSelectedVideoAssignment(firstPending);
                }}
            >
                🏋️ HACER EL SIGUIENTE
            </button>
        </div>
      )}

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