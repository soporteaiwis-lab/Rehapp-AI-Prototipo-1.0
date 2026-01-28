import React from 'react';

interface PainScaleProps {
  value: number;
  onChange: (val: number) => void;
}

export const PainScale: React.FC<PainScaleProps> = ({ value, onChange }) => {
  const getLabel = (v: number) => {
    if (v === 0) return "Sin Dolor";
    if (v <= 3) return "Leve";
    if (v <= 7) return "Moderado";
    if (v <= 9) return "Intenso";
    return "Invisitable";
  };

  const getColor = (v: number) => {
    if (v === 0) return "bg-green-100 border-green-300";
    if (v <= 3) return "bg-green-200 border-green-400";
    if (v <= 7) return "bg-yellow-200 border-yellow-400";
    if (v <= 9) return "bg-orange-200 border-orange-400";
    return "bg-red-200 border-red-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xl font-bold">Nivel de Dolor (EVA)</span>
        <span className="text-3xl font-extrabold text-blue-900">{value}</span>
      </div>
      
      <div className={`p-6 rounded-2xl border-4 text-center transition-colors ${getColor(value)}`}>
        <p className="text-2xl font-bold uppercase">{getLabel(value)}</p>
      </div>

      <input 
        type="range" 
        min="0" 
        max="10" 
        step="1" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-12 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      
      <div className="flex justify-between text-sm font-bold text-gray-500 px-1">
        <span>0 😊</span>
        <span>5 😐</span>
        <span>10 😫</span>
      </div>
    </div>
  );
};