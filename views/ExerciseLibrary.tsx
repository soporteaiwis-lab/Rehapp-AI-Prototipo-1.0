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
  
  // State for modals
  const [selectedVideoAssignment, setSelectedVideoAssignment] = useState<ExerciseAssignment | null>(null);
  const [textGuideAssignment, setTextGuideAssignment] = useState<ExerciseAssignment | null>(null);

  const loadExercises = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getAssignedExercises(user.id);
      setAssignments(data);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, [user.id]);

  // Handle completion (via Modal or Quick Check)
  const handleLogSession = async (logData: Partial<ExerciseSessionLog>, videoIdParam?: string) => {
    const videoId = videoIdParam || selectedVideoAssignment?.video_id;
    if (!videoId) return;

    const fullLog: ExerciseSessionLog = {
      patient_id: user.id,
      video_id: videoId,
      fecha_realizacion: '', // API handles correct date
      timestamp: new Date().toISOString(),
      series_completadas: logData.series_completadas || 0,
      repeticiones_completadas: logData.repeticiones_completadas || 0,
      dificultad_percibida: logData.dificultad_percibida || 0,
      dolor_durante_ejercicio: logData.dolor_durante_ejercicio || null,
      completado: true
    };

    // --- OPTIMISTIC UI UPDATE ---
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

    // Close modals
    setSelectedVideoAssignment(null);
    setTextGuideAssignment(null);

    // --- BACKGROUND SYNC ---
    try {
      const result = await api.logExerciseSession(fullLog);
      
      if (result.success) {
        await loadExercises(true);
      } else {
        alert(result.message || "Error al registrar.");
        await loadExercises(false);
      }
    } catch (error) {
      console.error('Error logging session:', error);
      alert("Error de conexión.");
      await loadExercises(false);
    }
  };

  // Quick Action: "Ya lo hice" (Marks with defaults)
  const handleQuickComplete = (assign: ExerciseAssignment) => {
    if (window.confirm(`¿Marcar "${assign.video.titulo}" como realizado hoy?`)) {
        handleLogSession({
            series_completadas: 2, // Default assumption
            repeticiones_completadas: 10,
            dificultad_percibida: 5,
            completado: true
        }, assign.video_id);
    }
  };

  // Stats
  const totalAssigned = assignments.length;
  const completedTodayCount = assignments.filter(a => a.completed_today).length;
  const progressPercentage = totalAssigned > 0 ? (completedTodayCount / totalAssigned) * 100 : 0;
  
  // Find next pending exercise for the Hero section
  const nextUp = assignments.find(a => !a.completed_today) || assignments[0];

  if (loading && assignments.length === 0) return <div className="p-10 text-center text-gray-500">Cargando ejercicios...</div>;

  return (
    <div className="pantalla-ejercicios bg-gray-100 min-h-screen pb-24">
      
      {/* HEADER NETFLIX STYLE */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
         <h1 className="text-2xl font-extrabold text-gray-800">🎬 Mis Ejercicios</h1>
         <div className="text-right">
             <div className="text-xs text-gray-400 font-bold uppercase">Tu Progreso</div>
             <div className="text-xl font-black text-blue-600 leading-none">{completedTodayCount}/{totalAssigned}</div>
         </div>
      </div>

      {/* HERO SECTION (Featured Next Exercise) */}
      {nextUp && (
        <div className="p-4">
             <div className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">
                 {nextUp.completed_today ? '¡Todo listo! Repasa si quieres:' : 'Siguiente ejercicio:'}
             </div>
             <div 
                className="relative w-full h-56 rounded-2xl overflow-hidden shadow-xl bg-gray-900 cursor-pointer group"
                onClick={() => setSelectedVideoAssignment(nextUp)}
             >
                <img 
                    src={`https://img.youtube.com/vi/${nextUp.video.youtube_video_id}/hqdefault.jpg`} 
                    alt="Featured"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-2">
                        <span className="text-4xl ml-1">▶️</span>
                    </div>
                    <span className="text-white font-bold text-lg drop-shadow-md text-center px-4">
                        {nextUp.video.titulo}
                    </span>
                </div>
                {nextUp.completed_today && (
                     <div className="absolute top-4 right-4 bg-green-500 text-white font-bold px-3 py-1 rounded-full text-xs shadow-lg">
                         ✓ COMPLETADO
                     </div>
                )}
             </div>
        </div>
      )}

      {/* HORIZONTAL SLIDER (NETFLIX STYLE) */}
      <div className="mt-4">
        <h2 className="px-4 text-lg font-bold text-gray-700 mb-3">Tu Rutina Diaria</h2>
        
        {/* SCROLL CONTAINER */}
        <div className="flex overflow-x-auto gap-4 px-4 pb-8 snap-x snap-mandatory hide-scrollbar">
            {assignments.map(assign => (
                <div 
                    key={assign.id} 
                    className="snap-center shrink-0 w-[85vw] sm:w-[320px] bg-white rounded-2xl shadow-md overflow-hidden flex flex-col relative border border-gray-100"
                >
                    {/* Status Strip */}
                    {assign.completed_today && (
                        <div className="bg-green-100 text-green-700 text-xs font-bold text-center py-1">
                            ✅ EJERCICIO REALIZADO
                        </div>
                    )}

                    {/* Thumbnail Area */}
                    <div className="relative h-44 bg-gray-200" onClick={() => setSelectedVideoAssignment(assign)}>
                        <img 
                            src={`https://img.youtube.com/vi/${assign.video.youtube_video_id}/mqdefault.jpg`} 
                            className={`w-full h-full object-cover ${assign.completed_today ? 'grayscale opacity-70' : ''}`}
                            alt={assign.video.titulo}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-5xl drop-shadow-lg opacity-80">▶️</span>
                        </div>
                        <div className="absolute top-2 left-2 bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-md">
                            {assign.video.numero_orden}
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1 line-clamp-2 min-h-[3rem]">
                            {assign.video.titulo}
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold mb-4">
                            {assign.video.repeticiones_sugeridas.split('•')[0]}
                        </p>

                        {/* ACTION BUTTONS */}
                        <div className="mt-auto flex flex-col gap-2">
                            <button 
                                onClick={() => setSelectedVideoAssignment(assign)}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
                            >
                                <span>▶</span> VER VIDEO
                            </button>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setTextGuideAssignment(assign)}
                                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm active:scale-95 transition-transform flex items-center justify-center gap-1 border border-gray-200"
                                >
                                    <span>📄</span> GUÍA
                                </button>
                                
                                {!assign.completed_today && (
                                    <button 
                                        onClick={() => handleQuickComplete(assign)}
                                        className="flex-1 py-2 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg text-sm active:scale-95 transition-transform flex items-center justify-center gap-1 border border-green-200"
                                    >
                                        <span>✅</span> LISTO
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            
            {/* Spacer for right padding in scroll */}
            <div className="w-2 shrink-0"></div>
        </div>
      </div>

      {/* TEXT GUIDE MODAL */}
      {textGuideAssignment && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
                <div className="bg-gray-100 p-4 flex justify-between items-center border-b">
                    <h3 className="font-bold text-lg text-gray-800">Guía de Texto</h3>
                    <button onClick={() => setTextGuideAssignment(null)} className="w-8 h-8 flex items-center justify-center bg-gray-300 rounded-full font-bold">✕</button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <h2 className="text-2xl font-extrabold text-blue-900 mb-4">{textGuideAssignment.video.titulo}</h2>
                    
                    <div className="mb-6">
                        <h4 className="font-bold text-gray-500 uppercase text-xs mb-1">Descripción</h4>
                        <p className="text-lg text-gray-800 leading-relaxed">{textGuideAssignment.video.descripcion}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-blue-50 p-3 rounded-xl text-center">
                            <span className="block text-xs font-bold text-blue-400 uppercase">Series</span>
                            <span className="text-xl font-bold text-blue-800">{textGuideAssignment.video.repeticiones_sugeridas}</span>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl text-center">
                            <span className="block text-xs font-bold text-blue-400 uppercase">Equipo</span>
                            <span className="text-xl font-bold text-blue-800 capitalize">{textGuideAssignment.video.equipamiento_necesario.join(', ').replace('_', ' ')}</span>
                        </div>
                    </div>

                    {!textGuideAssignment.completed_today ? (
                        <button 
                            onClick={() => handleQuickComplete(textGuideAssignment)}
                            className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
                        >
                            ✅ YA REALICÉ ESTE EJERCICIO
                        </button>
                    ) : (
                        <div className="text-center text-green-600 font-bold border-2 border-green-200 rounded-xl p-3 bg-green-50">
                            ¡Ejercicio Completado!
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* VIDEO PLAYER MODAL */}
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