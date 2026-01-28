import React, { useEffect, useRef, useState } from 'react';
import { PatientSummary, ExerciseSessionLog } from '../types';
import { api, MOCK_VIDEOS } from '../services/api';
import Chart from 'chart.js/auto';

interface Props {
  patient: PatientSummary;
  onClose: () => void;
}

type Tab = 'general' | 'kinesiologia';

export const PatientDetailModal: React.FC<Props> = ({ patient, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(false);
  
  // Charts Refs
  const generalChartRef = useRef<HTMLCanvasElement>(null);
  const generalChartInstance = useRef<Chart | null>(null);
  const difficultyChartRef = useRef<HTMLCanvasElement>(null);
  const difficultyChartInstance = useRef<Chart | null>(null);

  // General State
  const [stepGoal, setStepGoal] = useState(patient.meta_pasos);

  // Kinesiology State
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseSessionLog[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [freqSemanal, setFreqSemanal] = useState(3);
  const [series, setSeries] = useState(2);
  const [reps, setReps] = useState(10);
  const [notes, setNotes] = useState('');

  // 1. Initial Load (General & Kinesiology Data)
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const logs = await api.getPatientExerciseLogs(patient.id);
        setExerciseLogs(logs);

        const assignments = await api.getAssignedExercises(patient.id);
        const currentVideoIds = assignments.map(a => a.video_id);
        setSelectedVideos(currentVideoIds);
        
        const config = await api.getRoutineConfig(patient.id);
        if (config) {
            setFreqSemanal(config.freqSemanal || 3);
            setSeries(config.series || 2);
            setReps(config.reps || 10);
            setNotes(config.notes || '');
        }
        setLoading(false);
    };
    loadData();
  }, [patient]);

  // 2. Render General Chart
  useEffect(() => {
    if (activeTab === 'general' && generalChartRef.current) {
        if (generalChartInstance.current) generalChartInstance.current.destroy();

        const ctx = generalChartRef.current.getContext('2d');
        if (ctx) {
            generalChartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
                datasets: [
                {
                    label: 'Pasos Diarios',
                    data: [1200, 3000, 4500, 2000, 0, 4600, 4800],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    yAxisID: 'y',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Nivel Dolor (EVA)',
                    data: [2, 3, 2, 5, 0, 3, 1],
                    borderColor: '#f44336',
                    backgroundColor: 'transparent',
                    yAxisID: 'y1',
                    borderDash: [5, 5],
                    tension: 0.1
                }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Pasos' } },
                y1: { type: 'linear', display: true, position: 'right', min: 0, max: 10, title: { display: true, text: 'EVA' }, grid: { drawOnChartArea: false } },
                }
            }
            });
        }
    }
    return () => { if (generalChartInstance.current) generalChartInstance.current.destroy(); };
  }, [activeTab]);

  // 3. Render Difficulty Chart (Kinesiology)
  useEffect(() => {
    if (activeTab === 'kinesiologia' && difficultyChartRef.current && exerciseLogs.length > 0) {
        if (difficultyChartInstance.current) difficultyChartInstance.current.destroy();

        const ctx = difficultyChartRef.current.getContext('2d');
        if (ctx) {
            const videoStats: {[key: string]: number[]} = {};
            exerciseLogs.forEach(l => {
                const vidTitle = MOCK_VIDEOS.find(v => v.id === l.video_id)?.titulo || 'Desconocido';
                if (!videoStats[vidTitle]) videoStats[vidTitle] = [];
                videoStats[vidTitle].push(l.dificultad_percibida);
            });

            const labels = Object.keys(videoStats);
            const data = labels.map(k => {
                const vals = videoStats[k];
                return vals.reduce((a,b) => a+b, 0) / vals.length;
            });

            difficultyChartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Dificultad Promedio (1-10)',
                        data: data,
                        backgroundColor: 'rgba(33, 150, 243, 0.6)',
                        borderColor: '#2196F3',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, max: 10 } }
                }
            });
        }
    }
    return () => { if (difficultyChartInstance.current) difficultyChartInstance.current.destroy(); };
  }, [activeTab, exerciseLogs]);

  // --- Handlers ---

  const handleToggleVideo = (videoId: string) => {
    setSelectedVideos(prev => 
        prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );
  };

  const handleSaveRoutine = async () => {
    if (selectedVideos.length === 0) {
        alert("Selecciona al menos un ejercicio.");
        return;
    }
    setLoading(true);
    await api.saveExerciseRoutine(patient.id, selectedVideos, { freqSemanal, series, reps, notes });
    alert("✅ Rutina actualizada exitosamente");
    setLoading(false);
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await api.updatePatientTreatment(patient.id, stepGoal);
    alert(`✅ Tratamiento actualizado para ${patient.nombre}. Meta guardada.`);
    setLoading(false);
    onClose();
  };

  const getPainAlerts = () => exerciseLogs.filter(l => l.dolor_durante_ejercicio && l.dolor_durante_ejercicio >= 7);

  const getComplianceData = () => {
    const days = [];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
            date: d.toISOString().split('T')[0],
            name: dayNames[d.getDay()]
        });
    }
    return days;
  };
  const last7Days = getComplianceData();
  
  // LOGIC FIX: Sort Active Exercises by MOCK_VIDEOS order (1-8)
  const activeExercises = Array.from(new Set([
    ...selectedVideos,
    ...exerciseLogs.map(l => l.video_id)
  ])).sort((idA, idB) => {
      const videoA = MOCK_VIDEOS.find(v => v.id === idA);
      const videoB = MOCK_VIDEOS.find(v => v.id === idB);
      return (videoA?.numero_orden || 0) - (videoB?.numero_orden || 0);
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white w-full h-full sm:h-[90vh] sm:rounded-2xl max-w-5xl flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-blue-900">{patient.nombre}</h2>
            <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-500 mt-1">
               <span>{patient.edad} años</span>
               <span className="hidden sm:inline">•</span>
               <span>{patient.alerta ? '🔴 Crítico' : '🟢 Estable'}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 font-bold text-gray-600">✕</button>
        </div>

        {/* TABS */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 sm:py-4 font-bold text-center text-sm sm:text-base border-b-4 transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('general')}
          >
            📊 Clínico
          </button>
          <button 
            className={`flex-1 py-3 sm:py-4 font-bold text-center text-sm sm:text-base border-b-4 transition-colors ${activeTab === 'kinesiologia' ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('kinesiologia')}
          >
            📹 Kinesiología
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white pb-20 sm:pb-6">
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-4">Historial (7 días)</h3>
                  <div className="h-56 sm:h-64 relative">
                     <canvas ref={generalChartRef}></canvas>
                  </div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <h3 className="font-bold text-red-800 mb-2">Dolor Reciente</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Hace 2 días</span>
                      <span className="font-bold text-red-600">EVA 5</span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveGeneral} className="space-y-6 bg-gray-50 p-4 rounded-xl h-fit border">
                <h3 className="font-bold text-gray-800 text-lg border-b pb-2">Tratamiento</h3>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Meta Pasos</label>
                  <input 
                    type="number" 
                    value={stepGoal}
                    onChange={(e) => setStepGoal(Number(e.target.value))}
                    className="w-full p-3 border rounded-lg focus:border-blue-500"
                  />
                </div>
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: KINESIOLOGÍA */}
          {activeTab === 'kinesiologia' && (
            <div className="space-y-6 sm:space-y-8">
              
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                  <h3 className="font-bold text-green-800">Biblioteca Ejercicios</h3>
                </div>
                <div className="max-h-60 sm:max-h-80 overflow-y-auto">
                    <table className="w-full text-sm sm:text-base">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm text-left">
                            <tr>
                                <th className="p-2 w-12 text-center">#</th>
                                <th className="p-2 hidden sm:table-cell">Video</th>
                                <th className="p-2">Detalle</th>
                                <th className="p-2 text-center">Asignar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {MOCK_VIDEOS.map(video => (
                                <tr key={video.id} className="hover:bg-gray-50">
                                    <td className="p-2 text-center font-bold text-gray-400">{video.numero_orden}</td>
                                    <td className="p-2 hidden sm:table-cell">
                                        <img 
                                            src={`https://img.youtube.com/vi/${video.youtube_video_id}/default.jpg`} 
                                            className="w-20 h-14 object-cover rounded" 
                                            alt="mini"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <div className="font-bold text-gray-800 line-clamp-1">{video.titulo}</div>
                                        <div className="text-xs text-gray-500">{video.nivel_dificultad}</div>
                                    </td>
                                    <td className="p-2 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 accent-green-600"
                                            checked={selectedVideos.includes(video.id)}
                                            onChange={() => handleToggleVideo(video.id)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-gray-50 p-4 rounded-xl border">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase">Configuración</h3>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Días/Sem</label>
                            <select 
                                className="w-full p-2 border rounded-lg bg-white text-sm"
                                value={freqSemanal}
                                onChange={(e) => setFreqSemanal(Number(e.target.value))}
                            >
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Series</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded-lg text-sm" 
                                value={series}
                                onChange={(e) => setSeries(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">Reps</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded-lg text-sm"
                                value={reps}
                                onChange={(e) => setReps(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Notas</label>
                        <textarea 
                            className="w-full p-2 border rounded-lg h-16 text-sm"
                            placeholder="Instrucciones..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                    </div>

                    <button 
                        className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700"
                        onClick={handleSaveRoutine}
                        disabled={loading}
                    >
                        {loading ? '...' : 'Guardar Rutina'}
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <h3 className="font-bold text-gray-700 text-sm mb-2">Cumplimiento (7 días)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr>
                                        <th className="text-left">Ej</th>
                                        {last7Days.map(d => (
                                            <th key={d.date} className="w-6 text-center">{d.name.charAt(0)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeExercises.map(vidId => {
                                        const video = MOCK_VIDEOS.find(v => v.id === vidId);
                                        // Include Number in Title
                                        const videoTitle = video ? `${video.numero_orden}. ${video.titulo}` : 'Desconocido';
                                        
                                        return (
                                            <tr key={vidId} className="border-t">
                                                <td className="py-2 truncate max-w-[150px]" title={videoTitle}>
                                                    {videoTitle}
                                                </td>
                                                {last7Days.map(day => {
                                                    const done = exerciseLogs.some(l => 
                                                        l.video_id === vidId && 
                                                        l.fecha_realizacion === day.date && 
                                                        l.completado
                                                    );
                                                    return (
                                                        <td key={day.date} className="text-center">
                                                            {done ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-200">·</span>}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};