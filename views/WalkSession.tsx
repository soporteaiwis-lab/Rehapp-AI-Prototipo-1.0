import React, { useState, useEffect, useRef } from 'react';
import { WalkSession as WalkSessionType, User, PainResponse } from '../types';
import { storageService } from '../services/storageService';
import { api } from '../services/api';

interface Props {
  user: User;
  onFinish: () => void;
}

export const WalkSession: React.FC<Props> = ({ user, onFinish }) => {
  // Logic State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [steps, setSteps] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // UI State
  const [showPainModal, setShowPainModal] = useState(false);
  const [showBlockScreen, setShowBlockScreen] = useState(false);
  const [blockMessage, setBlockMessage] = useState({ title: '', message: '' });

  const timerRef = useRef<number | null>(null);

  // Auto-start on mount
  useEffect(() => {
    const init = async () => {
        const res = await api.startActivity(user.id, 'caminata');
        setSessionId(res.session_id);
        startTimer();
    };
    init();

    return () => stopTimer();
  }, []);

  const startTimer = () => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setSeconds(s => {
        const newS = s + 1;
        // Simulate steps (approx 1.2 steps per second walking)
        setSteps(Math.floor(newS * 1.2)); 
        return newS;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleStop = async () => {
    stopTimer();
    // In a real app, we would ask for final pain level here too if not reported
    const session: WalkSessionType = {
        id: sessionId || Date.now().toString(),
        patientId: user.id,
        date: new Date().toISOString(),
        durationSeconds: seconds,
        steps: steps,
        painLevel: 0, // Default if stopped manually without pain
        stoppedDueToPain: false
    };
    await storageService.saveSession(session);
    onFinish();
  };

  // Lógica "Pantalla 4" & API Call
  const manejarDolor = async (nivelEVA: number) => {
    if (!sessionId) return;
    
    // Stop timer while processing
    stopTimer();
    
    try {
        const respuesta = await api.reportPain(sessionId, nivelEVA);
        
        // Always save the session state up to this point
        const session: WalkSessionType = {
            id: sessionId,
            patientId: user.id,
            date: new Date().toISOString(),
            durationSeconds: seconds,
            steps: steps,
            painLevel: nivelEVA,
            stoppedDueToPain: respuesta.bloquear_app
        };
        await storageService.saveSession(session);

        if (respuesta.accion === "ALTO_INMEDIATO") {
            // Bloquear App UI
            setShowPainModal(false);
            setBlockMessage({
                title: "🛑 DESCANSA AHORA",
                message: respuesta.mensaje
            });
            setShowBlockScreen(true);
            
            // Haptic feedback if available
            if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
        } else if (respuesta.accion === "PRECAUCION") {
            setShowPainModal(false);
            alert(`⚠️ ${respuesta.mensaje}`); // Simple native alert for precaution
            startTimer(); // Resume
        } else {
            setShowPainModal(false);
            startTimer(); // Resume
        }

    } catch (e) {
        console.error(e);
        alert("Error de conexión");
    }
  };

  // PANTALLA DE BLOQUEO (High Pain)
  if (showBlockScreen) {
    return (
        <div className="fixed inset-0 bg-red-50 z-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-8xl animate-bounce mb-6">🛑</div>
            <h1 className="text-4xl font-extrabold text-red-700 mb-4">{blockMessage.title}</h1>
            <p className="text-2xl font-medium text-gray-800 mb-12 leading-relaxed">
                {blockMessage.message}
            </p>
            <button 
                className="btn-secundario border-red-300 text-red-800 font-bold"
                onClick={onFinish}
            >
                Ya me siento mejor (Salir)
            </button>
        </div>
    );
  }

  // PANTALLA 4: MODAL DOLOR
  if (showPainModal) {
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">¿Qué tan fuerte es tu dolor?</h2>
                    <p className="text-lg text-gray-500">Selecciona del 1 (leve) al 10 (muy fuerte)</p>
                </div>

                <div className="escala-eva">
                    {[1,2,3,4,5,6,7,8,9,10].map(val => {
                        let emoji = '';
                        let colorClass = '';
                        if (val === 1) emoji = '😊';
                        if (val === 3) emoji = '😐';
                        if (val === 5) emoji = '😟';
                        if (val === 8) emoji = '😫';
                        if (val === 10) emoji = '😭';

                        if (val >= 8) colorClass = 'border-red-400 bg-red-50';
                        else if (val >= 5) colorClass = 'border-yellow-400 bg-yellow-50';
                        
                        return (
                            <button 
                                key={val}
                                className={`eva-btn ${colorClass}`}
                                onClick={() => manejarDolor(val)}
                            >
                                <span className="text-3xl">{val}</span>
                                <span className="text-2xl">{emoji}</span>
                            </button>
                        )
                    })}
                </div>

                <button 
                    onClick={() => { setShowPainModal(false); startTimer(); }}
                    className="w-full py-4 text-xl text-gray-500 font-bold mt-4"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
  }

  // PANTALLA 3: CAMINATA ACTIVA
  return (
    <div className="flex flex-col h-full pt-4">
      {/* Cronómetro Grande */}
      <div className="text-center mb-8 bg-white rounded-3xl p-6 shadow-sm mx-4">
        <div className="text-[80px] font-mono font-bold text-blue-900 leading-none">
            {formatTime(seconds)}
        </div>
        <div className="text-xl text-gray-400 font-bold uppercase tracking-widest">minutos</div>
      </div>

      {/* Métricas en Tiempo Real */}
      <div className="flex justify-around mb-8 px-2">
        <div className="text-center">
            <div className="text-3xl font-bold text-gray-800">{steps}</div>
            <div className="text-sm text-gray-500 font-bold">👣 Pasos</div>
        </div>
        <div className="text-center">
            <div className="text-3xl font-bold text-gray-800">{Math.floor(steps * 0.7)} m</div>
            <div className="text-sm text-gray-500 font-bold">📏 Distancia</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end gap-4 pb-6 px-2">
          {/* Botón de Dolor (Siempre Visible) */}
          <button 
            id="btn-dolor" 
            className="btn-gigante rojo pulse"
            onClick={() => setShowPainModal(true)}
          >
            <span className="text-4xl">⚠️</span>
            TENGO DOLOR
          </button>

          {/* Botón Detener */}
          <button 
            id="btn-detener" 
            className="btn-secundario text-red-600 border-red-100"
            onClick={handleStop}
          >
            ⏹️ Terminar Sesión
          </button>
      </div>
    </div>
  );
};