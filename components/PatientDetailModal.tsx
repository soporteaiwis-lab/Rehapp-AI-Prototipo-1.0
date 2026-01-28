import React, { useEffect, useRef, useState } from 'react';
import { PatientSummary, ExerciseSessionLog, ClinicalTrialMetrics, WalkSession } from '../types';
import { api, MOCK_VIDEOS, getLocalDateString } from '../services/api';
import { storageService } from '../services/storageService';
import Chart from 'chart.js/auto';

interface Props {
  patient: PatientSummary;
  onClose: () => void;
}

type Tab = 'general' | 'kinesiologia' | 'ensayo_clinico';

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
  const [walkSessions, setWalkSessions] = useState<WalkSession[]>([]);

  // Kinesiology State
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseSessionLog[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [freqSemanal, setFreqSemanal] = useState(3);
  const [series, setSeries] = useState(2);
  const [reps, setReps] = useState(10);
  const [notes, setNotes] = useState('');

  // Clinical Trial Metrics State
  const [metrics, setMetrics] = useState<ClinicalTrialMetrics>({
      fecha_evaluacion: new Date().toISOString().split('T')[0],
      peso_kg: 0,
      imc: 0,
      fc_reposo: 0,
      fc_max_teorica: 220 - patient.edad,
      fc_reserva: 0,
      itb_derecho: 0,
      itb_izquierdo: 0,
      test_marcha_6min_metros: 0,
      sts_30_seg_reps: 0,
      cuestionario_eq5d_puntaje: 0
  });

  // 1. Initial Load (All Data)
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

        const walks = await storageService.getSessionsByPatient(patient.id);
        setWalkSessions(walks);

        const savedMetrics = await api.getClinicalMetrics(patient.id);
        if (savedMetrics) {
            setMetrics(savedMetrics);
        }

        setLoading(false);
    };
    loadData();
  }, [patient]);

  // 2. Render General Chart (REAL DATA LOGIC)
  useEffect(() => {
    if (activeTab === 'general' && generalChartRef.current) {
        if (generalChartInstance.current) generalChartInstance.current.destroy();

        // --- DATA PROCESSING FOR CHART ---
        const dayLabels = [];
        const stepsData = [];
        const painData = [];
        
        // Generate last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Label (e.g., "Lun")
            const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
            dayLabels.push(dayName.charAt(0).toUpperCase() + dayName.slice(1));

            // 1. Sum Steps for this date
            const dailySteps = walkSessions
                .filter(s => s.date.startsWith(dateStr))
                .reduce((acc, curr) => acc + curr.steps, 0);
            stepsData.push(dailySteps);

            // 2. Max Pain for this date (Walk OR Exercise)
            const maxWalkPain = Math.max(0, ...walkSessions
                .filter(s => s.date.startsWith(dateStr))
                .map(s => s.painLevel));
            
            const maxExercisePain = Math.max(0, ...exerciseLogs
                .filter(l => l.fecha_realizacion === dateStr)
                .map(l => l.dolor_durante_ejercicio || 0));

            painData.push(Math.max(maxWalkPain, maxExercisePain));
        }

        const ctx = generalChartRef.current.getContext('2d');
        if (ctx) {
            generalChartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [
                {
                    label: 'Pasos Diarios',
                    data: stepsData,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    yAxisID: 'y',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#4CAF50'
                },
                {
                    label: 'Nivel Dolor Máx (EVA)',
                    data: painData,
                    borderColor: '#f44336',
                    backgroundColor: 'transparent',
                    yAxisID: 'y1',
                    borderDash: [5, 5],
                    tension: 0.1,
                    pointStyle: 'rectRot',
                    pointRadius: 6,
                    pointBackgroundColor: '#f44336'
                }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                    if (context.datasetIndex === 0) label += ' pasos';
                                    if (context.datasetIndex === 1) label += ' pts';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                y: { 
                    type: 'linear', 
                    display: true, 
                    position: 'left', 
                    title: { display: true, text: 'Pasos' },
                    beginAtZero: true,
                    suggestedMax: patient.meta_pasos + 1000
                },
                y1: { 
                    type: 'linear', 
                    display: true, 
                    position: 'right', 
                    min: 0, 
                    max: 10, 
                    title: { display: true, text: 'EVA' }, 
                    grid: { drawOnChartArea: false },
                    ticks: { stepSize: 1 }
                },
                }
            }
            });
        }
    }
    return () => { if (generalChartInstance.current) generalChartInstance.current.destroy(); };
  }, [activeTab, walkSessions, exerciseLogs, patient.meta_pasos]); // Dependencies updated to redraw on data change

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

  const handleSaveMetrics = async () => {
      setLoading(true);
      // Auto calculate BMI and HR Reserve
      const imc = (metrics.peso_kg > 0) ? metrics.peso_kg / 2.8 : 0; // Mock calculation, real needs height
      const fc_reserva = metrics.fc_max_teorica - metrics.fc_reposo;
      
      const updatedMetrics = { ...metrics, imc, fc_reserva };
      setMetrics(updatedMetrics);
      
      await api.saveClinicalMetrics(patient.id, updatedMetrics);
      alert("✅ Datos del Ensayo Clínico guardados.");
      setLoading(false);
  };

  // --- Logic for Volume Calculation (PDF Requirement: 60 mins total) ---
  const today = getLocalDateString();
  const todaysWalk = walkSessions.find(s => s.date.startsWith(today));
  const walkMinutes = todaysWalk ? Math.floor(todaysWalk.durationSeconds / 60) : 0;
  
  const todaysExercises = exerciseLogs.filter(l => l.fecha_realizacion === today);
  const exerciseMinutes = todaysExercises.reduce((acc, log) => {
      const vid = MOCK_VIDEOS.find(v => v.id === log.video_id);
      return acc + (vid?.duracion_estimada_minutos || 5);
  }, 0);

  const totalMinutesToday = walkMinutes + exerciseMinutes;
  const targetMinutes = 60; // PDF Requirement

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
        <div className="flex border-b overflow-x-auto">
          <button 
            className={`flex-1 py-3 px-4 sm:py-4 font-bold text-center text-sm sm:text-base border-b-4 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('general')}
          >
            📊 Clínico
          </button>
          <button 
            className={`flex-1 py-3 px-4 sm:py-4 font-bold text-center text-sm sm:text-base border-b-4 transition-colors whitespace-nowrap ${activeTab === 'kinesiologia' ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('kinesiologia')}
          >
            📹 Kinesiología
          </button>
          <button 
            className={`flex-1 py-3 px-4 sm:py-4 font-bold text-center text-sm sm:text-base border-b-4 transition-colors whitespace-nowrap ${activeTab === 'ensayo_clinico' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('ensayo_clinico')}
          >
            🔬 Ficha Ensayo
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
                
                {/* PDF Requirement: Volumne of Training */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h3 className="font-bold text-blue-800 mb-2 uppercase text-sm">Volumen de Entrenamiento (Hoy)</h3>
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-3xl font-extrabold text-blue-900">{totalMinutesToday} min</span>
                            <span className="text-sm text-gray-600 ml-2">/ {targetMinutes} min (Meta PDF)</span>
                        </div>
                        <div className="text-right text-xs text-gray-500 font-semibold">
                            <div>Caminata: {walkMinutes} min</div>
                            <div>Fuerza: {exerciseMinutes} min</div>
                        </div>
                    </div>
                    <div className="w-full bg-blue-200 h-2 rounded-full mt-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min((totalMinutesToday/targetMinutes)*100, 100)}%` }}></div>
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

          {/* TAB 3: ENSAYO CLÍNICO (PDF DATA) */}
          {activeTab === 'ensayo_clinico' && (
              <div className="space-y-6">
                  <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                      <h3 className="font-bold text-purple-900">Objetivo del Estudio</h3>
                      <p className="text-sm text-purple-700 mt-1">
                          Evaluar eficacia de programa domiciliario (3 ses/semana, 60 mins). 
                          <br />
                          <strong>Meta Intensidad:</strong> Caminar hasta EVA 8-10, descansar y retomar.
                      </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* CARD 1: Variables Fisiológicas */}
                      <div className="bg-white p-5 rounded-xl border shadow-sm">
                          <h4 className="font-bold text-gray-800 border-b pb-2 mb-4">Hemodinámica & Antropometría</h4>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="label-input">Peso (Kg)</label>
                                  <input type="number" className="input-std" value={metrics.peso_kg} onChange={e => setMetrics({...metrics, peso_kg: Number(e.target.value)})} />
                              </div>
                              <div>
                                  <label className="label-input">FC Reposo (lpm)</label>
                                  <input type="number" className="input-std" value={metrics.fc_reposo} onChange={e => setMetrics({...metrics, fc_reposo: Number(e.target.value)})} />
                              </div>
                              <div>
                                  <label className="label-input">ITB Derecho</label>
                                  <input type="number" step="0.1" className="input-std" value={metrics.itb_derecho} onChange={e => setMetrics({...metrics, itb_derecho: Number(e.target.value)})} />
                              </div>
                              <div>
                                  <label className="label-input">ITB Izquierdo</label>
                                  <input type="number" step="0.1" className="input-std" value={metrics.itb_izquierdo} onChange={e => setMetrics({...metrics, itb_izquierdo: Number(e.target.value)})} />
                              </div>
                              <div className="col-span-2 bg-gray-100 p-2 rounded text-center">
                                  <div className="text-xs text-gray-500 font-bold uppercase">FC Máxima Teórica (220-edad)</div>
                                  <div className="text-xl font-bold text-gray-800">{metrics.fc_max_teorica} lpm</div>
                              </div>
                          </div>
                      </div>

                      {/* CARD 2: Capacidad Funcional */}
                      <div className="bg-white p-5 rounded-xl border shadow-sm">
                          <h4 className="font-bold text-gray-800 border-b pb-2 mb-4">Capacidad Funcional (Objetivos 1 & 3)</h4>
                          <div className="space-y-4">
                              <div>
                                  <label className="label-input">Test Marcha 6 Minutos (Metros)</label>
                                  <div className="flex items-center gap-2">
                                      <input type="number" className="input-std text-lg" value={metrics.test_marcha_6min_metros} onChange={e => setMetrics({...metrics, test_marcha_6min_metros: Number(e.target.value)})} />
                                      <span className="text-gray-500 font-bold">m</span>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="label-input">STS 30 segundos (Repeticiones)</label>
                                  <div className="flex items-center gap-2">
                                      <input type="number" className="input-std text-lg" value={metrics.sts_30_seg_reps} onChange={e => setMetrics({...metrics, sts_30_seg_reps: Number(e.target.value)})} />
                                      <span className="text-gray-500 font-bold">reps</span>
                                  </div>
                              </div>

                              <div>
                                  <label className="label-input">Calidad de Vida (EQ-5D Puntaje 0-100)</label>
                                  <input type="number" className="input-std" value={metrics.cuestionario_eq5d_puntaje} onChange={e => setMetrics({...metrics, cuestionario_eq5d_puntaje: Number(e.target.value)})} />
                              </div>
                          </div>
                      </div>

                      {/* CARD 3: Calculadora de Progresión */}
                      <div className="md:col-span-2 bg-green-50 p-5 rounded-xl border border-green-200">
                           <h4 className="font-bold text-green-900 mb-2">Calculadora de Progresión (Criterio: Aumentar 10%)</h4>
                           <div className="text-sm text-green-800 mb-4">
                               Si el paciente camina 10 min continuos sin dolor o alcanza el 80% de FC Reserva, sugerir aumento.
                           </div>
                           <div className="flex gap-4 items-center bg-white p-3 rounded-lg border border-green-100">
                                <div className="flex-1">
                                    <div className="text-xs text-gray-500 font-bold">Meta Actual Pasos</div>
                                    <div className="text-xl font-bold">{stepGoal}</div>
                                </div>
                                <div className="text-green-500 text-2xl font-bold">➔</div>
                                <div className="flex-1">
                                    <div className="text-xs text-green-600 font-bold">Nueva Meta Sugerida (+10%)</div>
                                    <div className="text-xl font-bold text-green-700">{Math.round(stepGoal * 1.1)}</div>
                                </div>
                                <button 
                                    className="px-4 py-2 bg-green-600 text-white font-bold rounded shadow-sm hover:bg-green-700"
                                    onClick={() => setStepGoal(Math.round(stepGoal * 1.1))}
                                >
                                    Aplicar
                                </button>
                           </div>
                      </div>

                  </div>

                  <button 
                      className="w-full py-4 bg-blue-800 text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 mt-4"
                      onClick={handleSaveMetrics}
                  >
                      GUARDAR DATOS CLÍNICOS
                  </button>
              </div>
          )}

        </div>
      </div>
      
      {/* Mini Styles for this component */}
      <style>{`
        .label-input {
            display: block;
            font-size: 0.75rem;
            font-weight: 700;
            color: #666;
            margin-bottom: 4px;
            text-transform: uppercase;
        }
        .input-std {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-weight: 600;
        }
      `}</style>
    </div>
  );
};