import React, { useState } from 'react';
import { api } from '../services/api';
import { Recipe } from '../types';

export const Nutrition: React.FC = () => {
  const [ingredients, setIngredients] = useState('');
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!ingredients.trim()) return;
    setLoading(true);
    
    const recipe = await api.generateNutritionPlan(
      ingredients.split(',').map(i => i.trim()),
      "Enfermedad Arterial Periférica"
    );
    
    setGeneratedRecipe(recipe);
    setLoading(false);
  };

  return (
    <div className="space-y-6 pt-2">
      <h2 className="text-3xl font-extrabold text-green-700">🥗 Consejos de Alimentación</h2>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <p className="text-xl font-bold text-gray-700 mb-4">
            ¿Qué alimentos tienes en casa?
        </p>
        
        <textarea 
            id="ingredientes" 
            className="w-full p-4 text-xl border-2 border-green-200 rounded-xl focus:border-green-500 outline-none min-h-[120px]"
            placeholder="Ejemplo: Pollo, arroz, brócoli, limón..." 
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
        ></textarea>
        
        <button 
            id="btn-generar-receta" 
            className="btn-gigante verde mt-6"
            style={{ height: '90px', fontSize: '22px' }} // Slightly smaller than main action
            onClick={handleGenerate}
            disabled={loading}
        >
            {loading ? 'Pensando...' : '✨ Generar Receta'}
        </button>
      </div>

      {/* Result Card */}
      {generatedRecipe && (
          <div id="receta-resultado" className="bg-white border-l-8 border-green-500 rounded-xl p-6 shadow-md animate-fade-in mb-8">
            <h3 className="text-2xl font-extrabold text-green-800 mb-2">
                {generatedRecipe.nombre}
            </h3>
            <p className="text-lg text-gray-600 bg-green-50 p-3 rounded-lg mb-4 italic">
                "{generatedRecipe.beneficios}"
            </p>

            <div className="space-y-4">
                <div>
                    <h4 className="font-bold text-gray-500 uppercase text-sm mb-2">Ingredientes</h4>
                    <ul className="list-disc list-inside text-lg text-gray-800">
                        {generatedRecipe.ingredientes.map((ing, i) => (
                            <li key={i} className="mb-1">{ing}</li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-gray-500 uppercase text-sm mb-2">Preparación</h4>
                    <ol className="list-decimal list-inside text-lg text-gray-800 space-y-2">
                        {generatedRecipe.preparacion.map((step, i) => (
                            <li key={i} className="pl-1">{step}</li>
                        ))}
                    </ol>
                </div>
            </div>
            
            <button 
                onClick={() => setGeneratedRecipe(null)}
                className="w-full mt-6 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl"
            >
                Cerrar Receta
            </button>
          </div>
      )}
    </div>
  );
};