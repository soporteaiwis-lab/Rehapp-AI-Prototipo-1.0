import React, { useEffect, useState } from 'react';
import { PatientSummary, User } from '../types';
import { api } from '../services/api';
import { storageService } from '../services/storageService';
import { PatientDetailModal } from '../components/PatientDetailModal';

// Components
import { Button } from '../components/Button';

export const DoctorDashboard: React.FC = () => {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  
  // Modal State for Add/Edit
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ id: '', name: '', age: 65, condition: 'EAP' });
  const [isEditing, setIsEditing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const summary = await api.getDoctorDashboard("d1");
    setPatients(summary);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Handlers ---

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
    // We assume ID matches so we just populate basic info. In a real app we'd fetch full User profile.
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
        if (isEditing) {
            await storageService.updatePatient(formData as User);
        } else {
            await storageService.addPatient(formData as User);
        }
        setShowFormModal(false);
        loadData();
    } catch (error: any) {
        alert(error.message);
    }
  };

  // Calculate stats
  const criticalCount = patients.filter(p => p.ultimo_dolor_eva >= 8).length;
  const warningCount = patients.filter(p => p.cumplimiento_semanal < 3 && p.ultimo_dolor_eva < 8).length;
  const okCount = patients.filter(p => !p.alerta && p.ultimo_dolor_eva < 8).length;

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Cargando panel médico...</div>;
  }

  return (
    <div className="dashboard-medico min-h-screen pb-20">
      <header className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
            <h1 className="text-3xl font-extrabold text-blue-900">Panel Médico - Rehapp UACH</h1>
            <p className="text-gray-500">Gestión de Rehabilitación Domiciliaria</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="block font-bold text-gray-800">Dra. Andrea Lara</span>
            <span className="text-xs text-gray-500">Fisiatra</span>
          </div>
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            AL
          </div>
        </div>
      </header>

      {/* Resumen de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="alerta-card critica">
          <div className="numero text-red-600">{criticalCount}</div>
          <div className="texto">Pacientes con dolor EVA ≥ 8</div>
        </div>
        <div className="alerta-card warning">
          <div className="numero text-orange-500">{warningCount}</div>
          <div className="texto">No cumplieron 3 sesiones</div>
        </div>
        <div className="alerta-card ok">
          <div className="numero text-green-600">{okCount}</div>
          <div className="texto">Cumpliendo tratamiento</div>
        </div>
      </div>

      {/* Tabla de Pacientes */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Listado de Pacientes Asignados</h3>
            <button 
                onClick={openAddModal}
                className="bg-blue-600 text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-colors"
            >
                + Nuevo Paciente
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="tabla-pacientes">
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
                {patients.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-gray-500 py-8">No hay pacientes registrados.</td></tr>
                ) : patients.map(patient => {
                    const isCritical = patient.ultimo_dolor_eva >= 8;
                    const isWarning = patient.cumplimiento_semanal < 3;
                    let rowClass = "";
                    let badge = <span className="text-green-500 text-2xl">●</span>;

                    if (isCritical) {
                        rowClass = "alerta-critica";
                        badge = <span className="text-red-600 text-2xl">🚨</span>;
                    } else if (isWarning) {
                        rowClass = "alerta-warning";
                        badge = <span className="text-orange-400 text-2xl">⚠️</span>;
                    }

                    return (
                        <tr key={patient.id} className={rowClass}>
                            <td className="text-center">{badge}</td>
                            <td className="font-mono font-bold text-gray-600">{patient.id}</td>
                            <td>
                                <div className="font-bold text-gray-800">{patient.nombre}</div>
                                {patient.alerta && <div className="text-xs text-red-500 font-semibold">{patient.alertas[0]}</div>}
                            </td>
                            <td>{patient.edad}</td>
                            <td>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full ${patient.cumplimiento_semanal >= 3 ? 'bg-green-500' : 'bg-orange-400'}`} 
                                            style={{ width: `${Math.min((patient.cumplimiento_semanal / 3) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-bold">{patient.cumplimiento_semanal}/3</span>
                                </div>
                            </td>
                            <td>
                                <span className={`eva-badge eva-${patient.ultimo_dolor_eva}`}>
                                    EVA {patient.ultimo_dolor_eva}
                                </span>
                            </td>
                            <td className="text-center">
                                <div className="flex justify-center gap-2">
                                    <button 
                                        onClick={() => setSelectedPatient(patient)}
                                        className="bg-blue-50 text-blue-700 font-bold text-xs px-3 py-1 rounded hover:bg-blue-100"
                                    >
                                        Ver
                                    </button>
                                    <button 
                                        onClick={() => openEditModal(patient)}
                                        className="bg-gray-50 text-gray-600 font-bold text-xs px-3 py-1 rounded hover:bg-gray-200"
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(patient.id, patient.nombre)}
                                        className="bg-red-50 text-red-600 font-bold text-xs px-3 py-1 rounded hover:bg-red-100"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODAL ADD/EDIT PATIENT */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-slide-up">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
                </h2>
                
                <form onSubmit={handleSavePatient} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ID / RUT (Acceso)</label>
                        <input 
                            type="text" 
                            className="w-full border rounded-lg p-3 font-mono"
                            placeholder="Ej: 12345678"
                            value={formData.id}
                            onChange={(e) => setFormData({...formData, id: e.target.value})}
                            disabled={isEditing} // ID cannot be changed once created for simplicity
                            required
                        />
                        {!isEditing && <p className="text-xs text-gray-500 mt-1">Este será el código de acceso del paciente.</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                        <input 
                            type="text" 
                            className="w-full border rounded-lg p-3"
                            placeholder="Ej: Juan Pérez"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Edad</label>
                            <input 
                                type="number" 
                                className="w-full border rounded-lg p-3"
                                value={formData.age}
                                onChange={(e) => setFormData({...formData, age: Number(e.target.value)})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Condición</label>
                            <input 
                                type="text" 
                                className="w-full border rounded-lg p-3"
                                value={formData.condition}
                                onChange={(e) => setFormData({...formData, condition: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button 
                            type="button" 
                            variant="outline" 
                            fullWidth 
                            onClick={() => setShowFormModal(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" fullWidth>
                            Guardar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Modal Detail */}
      {selectedPatient && (
        <PatientDetailModal 
            patient={selectedPatient} 
            onClose={() => setSelectedPatient(null)} 
        />
      )}
    </div>
  );
};