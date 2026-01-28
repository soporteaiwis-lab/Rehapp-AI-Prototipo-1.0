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
        // Load Logs
        const logs = await api.getPatientExerciseLogs(patient.id);
        setExerciseLogs(logs);

        // Load Current Assignments & Config
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
            // Group logs by video to avg difficulty
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

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`✅ Tratamiento actualizado para ${patient.nombre}`);
    onClose();
  };

  // --- Helpers ---
  const getPainAlerts = () => exerciseLogs.filter(l => l.dolor_durante_ejercicio && l.dolor_durante_ejercicio >= 7);

  // Generate Calendar Data for Compliance Table (Last 7 days)
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
  
  // Exercises that have been done at least once in 7 days OR are currently assigned
  const activeExercises = Array.from(new Set([
    ...selectedVideos,
    ...exerciseLogs.map(l => l.video_id)
  ]));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-2xl font-extrabold text-blue-900">{patient.nombre}</h2>
            <div className="flex gap-2 text-sm text-gray-500 mt-1">
               <span>{patient.edad} años</span>
               <span>•</span>
               <span>{patient.alerta ? '🔴 Estado Crítico' : '🟢 Estado Estable'}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full hover:bg-gray-300 font-bold text-gray-600">✕</button>
        </div>

        {/* TABS */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-4 font-bold text-center border-b-4 transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('general')}
          >
            📊 Resumen Clínico
          </button>
          <button 
            className={`flex-1 py-4 font-bold text-center border-b-4 transition-colors ${activeTab === 'kinesiologia' ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('kinesiologia')}
          >
            📹 Gestión Kinesiología
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Chart */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-4">Historial de Pasos y Dolor (7 días)</h3>
                  <div className="h-64 relative">
                     <canvas ref={generalChartRef}></canvas>
                  </div>
                </div>
                
                {/* Pain Alerts List (General) */}
                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <h3 className="font-bold text-red-800 mb-2">Últimos Eventos de Dolor</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Hace 2 días</span>
                      <span className="font-bold text-red-600">EVA 5 (Precaución)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Config Form */}
              <form onSubmit={handleSaveGeneral} className="space-y-6 bg-gray-50 p-6 rounded-xl h-fit border">
                <h3 className="font-bold text-gray-800 text-lg border-b pb-2">Ajuste de Tratamiento</h3>
                
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Meta de Pasos Diaria</label>
                  <input 
                    type="number" 
                    value={stepGoal}
                    onChange={(e) => setStepGoal(Number(e.target.value))}
                    className="w-full p-3 border rounded-lg focus:border-blue-500"
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg">
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: KINESIOLOGÍA (VIDEO MODULE) */}
          {activeTab === 'kinesiologia' && (
            <div className="space-y-8">
              
              {/* SECCIÓN 1: BIBLIOTECA DE VIDEOS */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="bg-green-50 px-6 py-4 border-b border-green-100">
                  <h3 className="font-bold text-green-800 text-lg">Biblioteca de Ejercicios Disponibles</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                    <table className="tabla-pacientes w-full">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr>
                                <th className="text-center w-16">#</th>
                                <th className="w-32">Vista Previa</th>
                                <th>Detalles del Ejercicio</th>
                                <th>Grupos Musculares</th>
                                <th>Asignar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {MOCK_VIDEOS.map(video => (
                                <tr key={video.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="text-center font-bold text-gray-400">{video.numero_orden}</td>
                                    <td>
                                        <img 
                                            src={`https://img.youtube.com/vi/${video.youtube_video_id}/default.jpg`} 
                                            className="thumbnail-small" 
                                            alt={video.titulo}
                                            onClick={() => window.open(`https://www.youtube.com/watch?v=${video.youtube_video_id}`, '_blank')}
                                        />
                                    </td>
                                    <td>
                                        <div className="font-bold text-gray-800 text-base">{video.titulo}</div>
                                        <div className="text-xs text-gray-500 mt-1">{video.repeticiones_sugeridas}</div>
                                        <div className="text-xs text-gray-500">Eq: {video.equipamiento_necesario.join(', ')}</div>
                                    </td>
                                    <td>
                                        {video.grupos_musculares.map(gm => (
                                            <span key={gm} className="badge-musculo">{gm}</span>
                                        ))}
                                    </td>
                                    <td className="text-center">
                                        <input 
                                            type="checkbox" 
                                            className="checkbox-asignar"
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

              {/* SECCIÓN 2: CONFIGURACIÓN Y CUMPLIMIENTO (2 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* COL 1: CONFIG FORM */}
                <div className="bg-gray-50 p-6 rounded-xl border">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>⚙️</span> Configuración de la Rutina
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Frecuencia</label>
                            <select 
                                className="w-full p-2 border rounded-lg bg-white"
                                value={freqSemanal}
                                onChange={(e) => setFreqSemanal(Number(e.target.value))}
                            >
                                <option value="2">2 días/sem</option>
                                <option value="3">3 días/sem</option>
                                <option value="4">4 días/sem</option>
                                <option value="5">5 días/sem</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Series</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded-lg" 
                                value={series}
                                onChange={(e) => setSeries(Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Reps</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded-lg"
                                value={reps}
                                onChange={(e) => setReps(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Notas para el paciente</label>
                        <textarea 
                            className="w-full p-3 border rounded-lg h-24 text-sm"
                            placeholder="Ej: Si sientes dolor en la rodilla, descansa 2 minutos entre series."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                    </div>

                    <button 
                        className="btn-asignar-rutina"
                        onClick={handleSaveRoutine}
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : '✓ ASIGNAR RUTINA'}
                    </button>
                </div>

                {/* COL 2: COMPLIANCE & CHARTS */}
                <div className="space-y-6">
                    
                    {/* Compliance Table */}
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <h3 className="font-bold text-gray-700 text-sm mb-2">Cumplimiento (Últimos 7 días)</h3>
                        <div className="overflow-x-auto">
                            <table className="tabla-cumplimiento">
                                <thead>
                                    <tr>
                                        <th className="text-left pl-2">Ejercicio</th>
                                        {last7Days.map(d => (
                                            <th key={d.date}>{d.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeExercises.map(vidId => {
                                        const videoTitle = MOCK_VIDEOS.find(v => v.id === vidId)?.titulo || 'Unknown';
                                        return (
                                            <tr key={vidId}>
                                                <td className="text-left font-medium text-xs pl-2 truncate max-w-[100px]" title={videoTitle}>{videoTitle}</td>
                                                {last7Days.map(day => {
                                                    const done = exerciseLogs.some(l => 
                                                        l.video_id === vidId && 
                                                        l.fecha_realizacion === day.date && 
                                                        l.completado
                                                    );
                                                    return (
                                                        <td key={day.date}>
                                                            {done ? <span className="check-completado">✓</span> : <span className="check-falta">·</span>}
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

                    {/* Difficulty Chart */}
                    <div className="bg-white p-4 rounded-xl border shadow-sm h-48 relative">
                        <h3 className="font-bold text-gray-700 text-sm mb-2">Dificultad Percibida Promedio</h3>
                        <canvas ref={difficultyChartRef}></canvas>
                    </div>

                    {/* Pain Alerts (Specific to Exercises) */}
                    {getPainAlerts().length > 0 && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-200" id="alertas-dolor-ejercicios">
                            <h4 className="font-bold text-red-700 text-sm mb-2">⚠️ Alertas de Dolor en Ejercicios</h4>
                            {getPainAlerts().slice(0, 3).map((log, idx) => (
                                <div key={idx} className="alerta-dolor-item">
                                    <div className="truncate max-w-[150px] font-bold text-gray-800">
                                        {MOCK_VIDEOS.find(v => v.id === log.video_id)?.titulo}
                                    </div>
                                    <span className={`eva-badge eva-${log.dolor_durante_ejercicio}`}>EVA {log.dolor_durante_ejercicio}</span>
                                    <span className="text-xs text-gray-500">{log.fecha_realizacion}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};