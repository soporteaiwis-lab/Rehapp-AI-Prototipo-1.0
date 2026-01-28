import React, { useEffect, useRef, useState } from 'react';
import { PatientSummary, TreatmentPlan } from '../types';
import Chart from 'chart.js/auto';

interface Props {
  patient: PatientSummary;
  onClose: () => void;
}

export const PatientDetailModal: React.FC<Props> = ({ patient, onClose }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [stepGoal, setStepGoal] = useState(patient.meta_pasos);
  const [weeklyGoal, setWeeklyGoal] = useState(180);

  // Initialize Chart
  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        // Mock data generation for graph
        const labels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
        const stepsData = [1200, 3000, 4500, 2000, 0, 4600, 4800];
        const painData = [2, 3, 2, 5, 0, 3, 1];

        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Pasos Diarios',
                data: stepsData,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                yAxisID: 'y',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Nivel Dolor (EVA)',
                data: painData,
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
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Pasos' }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                min: 0,
                max: 10,
                title: { display: true, text: 'EVA' },
                grid: {
                  drawOnChartArea: false,
                },
              },
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [patient]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`✅ Tratamiento actualizado para ${patient.nombre}:\nMeta Pasos: ${stepGoal}\nMinutos Semanales: ${weeklyGoal}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-blue-900 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Ficha Clínica: {patient.nombre}</h2>
            <p className="opacity-80">Edad: {patient.edad} años | EAP Moderada</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-800 p-2 rounded-full">
            ✕ CERRAR
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Stats & Chart */}
          <div className="space-y-6">
            <div className="bg-white border rounded-xl p-4 shadow-sm h-64">
              <canvas ref={chartRef}></canvas>
            </div>
            
            <div className="historial-dolor">
              <h3 className="font-bold text-gray-700 border-b pb-2 mb-4">Eventos de Dolor (Últimos 7 días)</h3>
              <ul className="space-y-3">
                {patient.ultimo_dolor_eva >= 8 ? (
                  <li className="flex items-center gap-3 bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
                    <span className="text-red-500 font-bold text-lg">26/01</span>
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">EVA {patient.ultimo_dolor_eva}</span>
                    <span className="text-sm text-gray-600">Sesión terminada por dolor</span>
                  </li>
                ) : (
                   <li className="text-gray-500 italic text-sm">Sin eventos críticos recientes.</li>
                )}
                <li className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-500 font-bold text-lg">24/01</span>
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">EVA 5</span>
                    <span className="text-sm text-gray-600">Pausa realizada, continuó sesión</span>
                  </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Edit Goals */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-blue-900 text-lg mb-6">⚙️ Configuración de Tratamiento</h3>
            
            <form id="form-editar-metas" onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Meta de Pasos Diaria</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        value={stepGoal}
                        onChange={(e) => setStepGoal(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-lg text-xl font-mono"
                    />
                    <span className="text-gray-500 font-bold">pasos</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Meta Minutos Semanales</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        value={weeklyGoal}
                        onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-lg text-xl font-mono"
                    />
                    <span className="text-gray-500 font-bold">min</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                 <label className="flex items-center gap-3 mb-4 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 accent-blue-600" defaultChecked />
                    <span className="text-gray-700 font-medium">Alertar si no cumple 3 días seguidos</span>
                 </label>
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg transition-transform active:scale-95"
              >
                GUARDAR CAMBIOS
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};