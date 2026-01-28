import React, { useEffect, useState } from 'react';
import { PatientSummary, User, ExerciseVideo } from '../types';
import { api } from '../services/api';
import { storageService } from '../services/storageService';
import { PatientDetailModal } from '../components/PatientDetailModal';

// Components
import { Button } from '../components/Button';

export const DoctorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pacientes' | 'biblioteca'>('pacientes');
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  
  // Library State
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Partial<ExerciseVideo>>({});
  
  // Modal State for Add/Edit Patient
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ id: '', name: '', age: 65, condition: 'EAP' });
  const [isEditing, setIsEditing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const summary = await api.getDoctorDashboard("d1");
    setPatients(summary);
    const videoList = await api.getAllVideos();
    setVideos(videoList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- VIDEO LIBRARY HANDLERS ---
  
  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleOpenVideoModal = (video?: ExerciseVideo) => {
    if (video) {
        setEditingVideo(video);
    } else {
        // Find next available order number
        const maxOrder = videos.length > 0 ? Math.max(...videos.map(v => v.numero_orden)) : 0;
        setEditingVideo({
            id: Date.now().toString(),
            numero_orden: maxOrder + 1,
            titulo: '',
            descripcion: '',
            youtube_video_id: '',
            tipo_ejercicio: 'fuerza_eeii',
            grupos_musculares: [],
            repeticiones_sugeridas: '2 series • 10 reps',
            equipamiento_necesario: [],
            nivel_dificultad: 'principiante',
            duracion_estimada_minutos: 5
        });
    }
    setShowVideoModal(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo.titulo || !editingVideo.youtube_video_id) {
        alert("Título y URL/ID de video son obligatorios");
        return;
    }

    // Try to extract ID if user pasted full URL
    const possibleId = extractYoutubeId(editingVideo.youtube_video_id);
    const finalId = possibleId || editingVideo.youtube_video_id;

    const videoToSave = {
        ...editingVideo,
        youtube_video_id: finalId
    } as ExerciseVideo;

    await api.saveVideoToLibrary(videoToSave);
    setShowVideoModal(false);
    loadData();
  };

  const handleDeleteVideo = async (id: string, title: string) => {
      if(window.confirm(`¿Eliminar video "${title}"? Se desasignará de todos los pacientes.`)) {
          await api.deleteVideoFromLibrary(id);
          loadData();
      }
  };

  // --- PATIENT HANDLERS ---

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Está seguro que desea eliminar al paciente ${name}? Esta acción no se puede deshacer.`)) {
        await storageService.deletePatient(id);
        loadData();
    }
  };

  const openAddModal = () => {
    setFormData({ id: '', name: '', age: 65, condition: 'EAP' });
    setIsEditing(false);
    setShowFormModal(true);
  };

  const openEditModal = (p: PatientSummary) => {
    setFormData({ id: p.id, name: p.nombre, age: p.edad, condition: 'EAP' }); 
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) {
        alert("ID y Nombre son obligatorios");
        return;
    }
    try {
        if (isEditing) await storageService.updatePatient(formData as User);
        else await storageService.addPatient(formData as User);
        setShowFormModal(false);
        loadData();
    } catch (error: any) {
        alert(error.message);
    }
  };

  // Stats
  const criticalCount = patients.filter(p => p.ultimo_dolor_eva >= 8).length;
  const warningCount = patients.filter(p => p.cumplimiento_semanal < 3 && p.ultimo_dolor_eva < 8).length;
  const okCount = patients.filter(p => !p.alerta && p.ultimo_dolor_eva < 8).length;

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">Cargando panel médico...</div>;

  return (
    <div className="dashboard-medico min-h-screen pb-20 bg-gray-50">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 bg-white p-4 sticky top-0 z-20 shadow-sm">
        <div className="mb-2 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-900">Panel Médico</h1>
            <p className="text-gray-500 text-sm">Gestión de Rehabilitación Domiciliaria</p>
        </div>
        
        {/* TAB SWITCHER */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === 'pacientes' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('pacientes')}
            >
                👥 Pacientes
            </button>
            <button 
                className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === 'biblioteca' ? 'bg-white text-blue-800 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('biblioteca')}
            >
                📹 Biblioteca Videos
            </button>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-end mt-2 sm:mt-0">
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">AL</div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4">
        
        {/* --- TAB: PACIENTES --- */}
        {activeTab === 'pacientes' && (
            <>
                {/* Resumen de Alertas */}
                <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-8">
                    <div className="alerta-card critica p-2 sm:p-5">
                        <div className="numero text-red-600 text-2xl sm:text-4xl">{criticalCount}</div>
                        <div className="texto text-[10px] sm:text-sm">Dolor Crítico</div>
                    </div>
                    <div className="alerta-card warning p-2 sm:p-5">
                        <div className="numero text-orange-500 text-2xl sm:text-4xl">{warningCount}</div>
                        <div className="texto text-[10px] sm:text-sm">Baja Adherencia</div>
                    </div>
                    <div className="alerta-card ok p-2 sm:p-5">
                        <div className="numero text-green-600 text-2xl sm:text-4xl">{okCount}</div>
                        <div className="texto text-[10px] sm:text-sm">En Tratamiento</div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Pacientes Asignados</h3>
                        <button onClick={openAddModal} className="bg-blue-600 text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md">+ Nuevo</button>
                    </div>

                    <div className="hidden sm:block overflow-x-auto">
                        <table className="tabla-pacientes w-full">
                            <thead>
                            <tr>
                                <th className="w-16 text-center">Est</th>
                                <th>ID / RUT</th>
                                <th>Paciente</th>
                                <th>Edad</th>
                                <th>Sesiones (Sem)</th>
                                <th>Último Dolor</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {patients.map(patient => (
                                <tr key={patient.id} className={patient.ultimo_dolor_eva >= 8 ? "alerta-critica" : (patient.cumplimiento_semanal < 3 ? "alerta-warning" : "")}>
                                    <td className="text-center">{patient.ultimo_dolor_eva >= 8 ? '🚨' : (patient.cumplimiento_semanal < 3 ? '⚠️' : '●')}</td>
                                    <td className="font-mono font-bold text-gray-600">{patient.id}</td>
                                    <td>
                                        <div className="font-bold text-gray-800">{patient.nombre}</div>
                                        {patient.alerta && <div className="text-xs text-red-500 font-semibold">{patient.alertas[0]}</div>}
                                    </td>
                                    <td>{patient.edad}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div className={`h-full ${patient.cumplimiento_semanal >= 3 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${Math.min((patient.cumplimiento_semanal / 3) * 100, 100)}%` }}></div>
                                            </div>
                                            <span className="text-sm font-bold">{patient.cumplimiento_semanal}/3</span>
                                        </div>
                                    </td>
                                    <td><span className={`eva-badge eva-${patient.ultimo_dolor_eva}`}>EVA {patient.ultimo_dolor_eva}</span></td>
                                    <td className="text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => setSelectedPatient(patient)} className="bg-blue-50 text-blue-700 font-bold text-xs px-3 py-1 rounded hover:bg-blue-100">Ver</button>
                                            <button onClick={() => openEditModal(patient)} className="bg-gray-50 text-gray-600 font-bold text-xs px-3 py-1 rounded hover:bg-gray-200">Editar</button>
                                            <button onClick={() => handleDelete(patient.id, patient.nombre)} className="bg-red-50 text-red-600 font-bold text-xs px-3 py-1 rounded hover:bg-red-100">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                     {/* Mobile List View */}
                    <div className="block sm:hidden divide-y">
                        {patients.map(patient => (
                            <div key={patient.id} className={`p-4 ${patient.ultimo_dolor_eva >= 8 ? 'bg-red-50 border-l-4 border-red-500' : ''}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-gray-800">{patient.nombre}</h4>
                                    <span className={`eva-badge eva-${patient.ultimo_dolor_eva}`}>EVA {patient.ultimo_dolor_eva}</span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => setSelectedPatient(patient)} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold text-sm">Ver Ficha</button>
                                    <button onClick={() => handleDelete(patient.id, patient.nombre)} className="px-3 bg-red-100 text-red-600 rounded">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        )}

        {/* --- TAB: BIBLIOTECA VIDEOS --- */}
        {activeTab === 'biblioteca' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Biblioteca de Ejercicios</h3>
                    <button onClick={() => handleOpenVideoModal()} className="bg-green-600 text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-green-700 shadow-md">+ Nuevo Video</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-3 text-center">Orden</th>
                                <th className="p-3 text-left">Video</th>
                                <th className="p-3 text-left">Detalles</th>
                                <th className="p-3 text-center">Config</th>
                                <th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {videos.map(video => (
                                <tr key={video.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-center font-bold text-lg text-blue-600">{video.numero_orden}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <img src={`https://img.youtube.com/vi/${video.youtube_video_id}/default.jpg`} className="w-20 h-14 object-cover rounded shadow-sm border" alt="thumb" />
                                            <div className="font-bold text-gray-800 max-w-[200px] leading-tight">{video.titulo}</div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="text-xs text-gray-500 mb-1 line-clamp-2">{video.descripcion}</div>
                                        <div className="flex gap-2">
                                            <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-1 rounded font-bold uppercase">{video.nivel_dificultad}</span>
                                            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded font-bold">{video.repeticiones_sugeridas}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center text-xs text-gray-400 font-mono">
                                        {video.youtube_video_id}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleOpenVideoModal(video)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">✏️</button>
                                            <button onClick={() => handleDeleteVideo(video.id, video.titulo)} className="p-2 bg-red-50 hover:bg-red-100 rounded text-red-600">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>

      {/* --- MODALS --- */}

      {/* PATIENT FORM MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-slide-up">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}</h2>
                <form onSubmit={handleSavePatient} className="space-y-4">
                    {/* ... Same inputs as before ... */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
                        <input type="text" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ID (RUT)</label>
                        <input type="text" className="w-full border p-2 rounded" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} disabled={isEditing} required />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <Button type="button" variant="outline" fullWidth onClick={() => setShowFormModal(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary" fullWidth>Guardar</Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* VIDEO FORM MODAL */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingVideo.id ? 'Editar Video' : 'Nuevo Video'}</h2>
                
                <form onSubmit={handleSaveVideo} className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Orden #</label>
                            <input 
                                type="number" 
                                className="w-full border-2 border-blue-200 p-2 rounded-lg text-center font-bold text-lg" 
                                value={editingVideo.numero_orden} 
                                onChange={e => setEditingVideo({...editingVideo, numero_orden: Number(e.target.value)})} 
                                required 
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link de YouTube (o ID)</label>
                            <input 
                                type="text" 
                                className="w-full border p-2 rounded-lg" 
                                placeholder="https://youtube.com/watch?v=..." 
                                value={editingVideo.youtube_video_id} 
                                onChange={e => setEditingVideo({...editingVideo, youtube_video_id: e.target.value})} 
                                required 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                        <input type="text" className="w-full border p-2 rounded-lg font-bold" value={editingVideo.titulo} onChange={e => setEditingVideo({...editingVideo, titulo: e.target.value})} required />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción (Guía de Texto)</label>
                        <textarea className="w-full border p-2 rounded-lg h-24" value={editingVideo.descripcion} onChange={e => setEditingVideo({...editingVideo, descripcion: e.target.value})}></textarea>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dificultad</label>
                            <select className="w-full border p-2 rounded-lg" value={editingVideo.nivel_dificultad} onChange={e => setEditingVideo({...editingVideo, nivel_dificultad: e.target.value})}>
                                <option value="principiante">Principiante</option>
                                <option value="intermedio">Intermedio</option>
                                <option value="avanzado">Avanzado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Series / Reps (Texto)</label>
                            <input type="text" className="w-full border p-2 rounded-lg" value={editingVideo.repeticiones_sugeridas} onChange={e => setEditingVideo({...editingVideo, repeticiones_sugeridas: e.target.value})} />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                         {editingVideo.youtube_video_id && (
                             <img 
                                src={`https://img.youtube.com/vi/${extractYoutubeId(editingVideo.youtube_video_id || '') || editingVideo.youtube_video_id}/default.jpg`} 
                                className="w-16 h-12 object-cover rounded" 
                                onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Error'}
                            />
                         )}
                         <div className="text-xs text-gray-500">
                             Vista previa de la miniatura. Asegúrese de que el enlace sea público.
                         </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button type="button" variant="outline" fullWidth onClick={() => setShowVideoModal(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary" fullWidth>Guardar Video</Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {selectedPatient && (
        <PatientDetailModal patient={selectedPatient} onClose={() => { setSelectedPatient(null); loadData(); }} />
      )}
    </div>
  );
};