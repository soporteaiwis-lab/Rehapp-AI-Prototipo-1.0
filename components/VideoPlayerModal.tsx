import React, { useState } from 'react';
import { ExerciseVideo, ExerciseSessionLog } from '../types';

interface Props {
  video: ExerciseVideo;
  onClose: () => void;
  onComplete: (logData: Partial<ExerciseSessionLog>) => void;
}

export const VideoPlayerModal: React.FC<Props> = ({ video, onClose, onComplete }) => {
  const [sets, setSets] = useState(2);
  const [reps, setReps] = useState(10);
  const [difficulty, setDifficulty] = useState(5);
  const [hasPain, setHasPain] = useState<boolean | null>(null);
  const [painLevel, setPainLevel] = useState<number>(0);

  const handleSubmit = () => {
    onComplete({
      series_completadas: sets,
      repeticiones_completadas: reps,
      dificultad_percibida: difficulty,
      dolor_durante_ejercicio: hasPain ? painLevel : null,
      completado: true
    });
  };

  const getEmbedUrl = (videoId: string) => `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;

  return (
    /* USO DE h-[100dvh] para asegurar altura dinámica real en móviles */
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col h-[100dvh] w-full overflow-hidden">
      {/* HEADER */}
      <div className="flex justify-between items-center p-3 sm:p-4 bg-white border-b shrink-0">
        <button 
          onClick={onClose}
          className="w-10 h-10 bg-gray-100 rounded-full text-gray-600 font-bold text-xl flex items-center justify-center hover:bg-gray-200"
        >
          ✕
        </button>
        <h2 className="text-base sm:text-lg font-bold text-gray-800 truncate px-2">{video.titulo}</h2>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* BODY (Scrollable) */}
      <div className="flex-1 overflow-y-auto pb-safe">
          {/* VIDEO PLAYER */}
          <div className="video-embed-wrapper sticky top-0 z-10 w-full bg-black shadow-lg">
            <iframe 
              src={getEmbedUrl(video.youtube_video_id)}
              title={video.titulo}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            ></iframe>
          </div>

          {/* CONTENT */}
          <div className="p-4 space-y-6 pb-24">
            
            {/* INFO */}
            <div className="bg-blue-50 p-4 rounded-xl flex justify-between text-sm">
              <div className="text-center">
                <span className="block text-gray-500 font-bold uppercase text-xs">Series</span>
                <span className="text-xl font-bold text-blue-800">{video.repeticiones_sugeridas.split('•')[0] || '2-3'}</span>
              </div>
              <div className="w-px bg-blue-200"></div>
              <div className="text-center">
                <span className="block text-gray-500 font-bold uppercase text-xs">Reps</span>
                <span className="text-xl font-bold text-blue-800">{video.repeticiones_sugeridas.split('•')[1] || '10-15'}</span>
              </div>
              <div className="w-px bg-blue-200"></div>
              <div className="text-center">
                <span className="block text-gray-500 font-bold uppercase text-xs">Equipo</span>
                <span className="text-2xl">{video.equipamiento_necesario[0] === 'silla' ? '🪑' : '📦'}</span>
              </div>
            </div>

            {/* REGISTRO FORM */}
            <div className="space-y-6">
              <h3 className="text-xl font-extrabold text-gray-800 border-b pb-2">Registro de Actividad</h3>

              {/* Series Counter */}
              <div>
                <label className="block text-gray-600 font-bold mb-2">Series realizadas:</label>
                <div className="selector-numero">
                  <button className="btn-menos" onClick={() => setSets(Math.max(1, sets - 1))}>-</button>
                  <input readOnly value={sets} />
                  <button className="btn-mas" onClick={() => setSets(sets + 1)}>+</button>
                </div>
              </div>

              {/* Reps Counter */}
              <div>
                <label className="block text-gray-600 font-bold mb-2">Repeticiones por serie:</label>
                <div className="selector-numero">
                  <button className="btn-menos" onClick={() => setReps(Math.max(1, reps - 1))}>-</button>
                  <input readOnly value={reps} />
                  <button className="btn-mas" onClick={() => setReps(reps + 1)}>+</button>
                </div>
              </div>

              {/* Difficulty Scale */}
              <div>
                <label className="block text-gray-600 font-bold mb-2">Dificultad (1=Fácil, 10=Difícil):</label>
                <div className="escala-dificultad">
                  {[1,2,3,4,5,6,7,8,9,10].map(val => (
                    <button 
                      key={val}
                      onClick={() => setDifficulty(val)}
                      className={`dif-btn ${difficulty === val ? 'selected' : ''}`}
                    >
                      {val}
                      {val === 5 && <span className="text-xs">😊</span>}
                      {val === 10 && <span className="text-xs">😓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pain Toggle */}
              <div>
                <label className="block text-gray-600 font-bold mb-2">¿Tuviste dolor?</label>
                <div className="toggle-grupo">
                  <button 
                    className={`toggle-btn ${hasPain === false ? 'activo' : ''}`}
                    onClick={() => setHasPain(false)}
                  >
                    No
                  </button>
                  <button 
                    className={`toggle-btn rojo ${hasPain === true ? 'activo' : ''}`}
                    onClick={() => setHasPain(true)}
                  >
                    Sí, tuve dolor
                  </button>
                </div>

                {hasPain && (
                  <div className="mt-4 animate-fade-in bg-red-50 p-4 rounded-xl border border-red-200">
                      <label className="block text-red-700 font-bold mb-2 text-center">Nivel de dolor (EVA):</label>
                      <div className="escala-dificultad" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        {[1,2,3,4,5,6,7,8,9,10].map(val => (
                            <button 
                            key={val}
                            onClick={() => setPainLevel(val)}
                            className={`dif-btn ${painLevel === val ? 'selected bg-red-500 border-red-500' : 'border-red-200 text-red-800'}`}
                            >
                            {val}
                            </button>
                        ))}
                      </div>
                  </div>
                )}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="pt-4 space-y-3">
              <button 
                className="w-full h-16 bg-gradient-to-r from-green-500 to-green-600 text-white text-xl font-bold rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                onClick={handleSubmit}
              >
                <span>✅</span> MARCAR COMPLETADO
              </button>
              
              <button 
                className="w-full py-4 text-gray-500 font-bold"
                onClick={onClose}
              >
                No pude hacerlo hoy
              </button>
            </div>
          </div>
      </div>
    </div>
  );
};