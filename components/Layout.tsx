import React from 'react';
import { User, Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  currentView: string;
  setView: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, setView }) => {
  if (!user) {
    return <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-extrabold text-blue-900">Rehapp</h1>
          <p className="text-sm text-gray-500 truncate max-w-[200px]">{user.name}</p>
        </div>
        <button onClick={onLogout} className="text-sm text-red-600 font-semibold underline px-2 py-2">
          Salir
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation (Only for Patients) */}
      {user.role === Role.PATIENT && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
          <NavButton 
            active={currentView === 'home'} 
            onClick={() => setView('home')} 
            icon="🏠" 
            label="Inicio" 
          />
          <NavButton 
            active={currentView === 'tracker'} 
            onClick={() => setView('tracker')} 
            icon="🚶" 
            label="Caminar" 
          />
          <NavButton 
            active={currentView === 'exercises'} 
            onClick={() => setView('exercises')} 
            icon="📹" 
            label="Videos" 
          />
          <NavButton 
            active={currentView === 'nutrition'} 
            onClick={() => setView('nutrition')} 
            icon="🍎" 
            label="Nutrición" 
          />
        </nav>
      )}
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center w-full py-1 ${active ? 'text-blue-700' : 'text-gray-400'}`}
  >
    <span className="text-2xl mb-0.5">{icon}</span>
    <span className={`text-[10px] font-bold ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);