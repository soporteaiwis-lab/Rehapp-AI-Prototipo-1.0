import React, { useEffect, useState } from 'react';
import { PatientSummary } from '../types';
import { api } from '../services/api';
import { PatientDetailModal } from '../components/PatientDetailModal';

export const DoctorDashboard: React.FC = () => {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const summary = await api.getDoctorDashboard("d1");
      setPatients(summary);
      setLoading(false);
    };
    loadData();
  }, []);

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
            <button className="text-blue-600 font-bold text-sm bg-white border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50">
                + Nuevo Paciente
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="tabla-pacientes">
                <thead>
                <tr>
                    <th className="w-16 text-center">Estado</th>
                    <th>Paciente</th>
                    <th>Edad</th>
                    <th>Meta Pasos</th>
                    <th>Sesiones (Semana)</th>
                    <th>Último Dolor</th>
                    <th>Acciones</th>
                </tr>
                </thead>
                <tbody>
                {patients.map(patient => {
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
                            <td>
                                <div className="font-bold text-gray-800">{patient.nombre}</div>
                                {patient.alerta && <div className="text-xs text-red-500 font-semibold">{patient.alertas[0]}</div>}
                            </td>
                            <td>{patient.edad}</td>
                            <td className="font-mono text-gray-600">{patient.meta_pasos.toLocaleString()}</td>
                            <td>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full ${patient.cumplimiento_semanal >= 3 ? 'bg-green-500' : 'bg-orange-400'}`} 
                                            style={{ width: `${(patient.cumplimiento_semanal / 3) * 100}%` }}
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
                            <td>
                                <button 
                                    onClick={() => setSelectedPatient(patient)}
                                    className="bg-white border border-gray-300 text-gray-700 font-bold text-sm px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm"
                                >
                                    Ver Detalle
                                </button>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal Integration */}
      {selectedPatient && (
        <PatientDetailModal 
            patient={selectedPatient} 
            onClose={() => setSelectedPatient(null)} 
        />
      )}
    </div>
  );
};