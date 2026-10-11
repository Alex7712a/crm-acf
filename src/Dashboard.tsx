import React from 'react';
import { supabase } from './supabase';

interface DashboardProps {
  session: any;
}

function Dashboard({ session }: DashboardProps) {
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra superior */}
      <nav className="bg-[#00006a] text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full overflow-hidden border-2 border-white">
            <img src="/Feliz_ACF.jpeg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-black tracking-wide">CRM <span className="text-[#fa0101]">ACF</span></h1>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-slate-200">
            Usuario: {session?.user?.email}
          </span>
          <button 
            onClick={handleLogout}
            className="bg-[#fa0101] hover:bg-white hover:text-[#fa0101] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Contenedor del Kanban */}
      <main className="flex-1 p-6 overflow-x-auto">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-[#00006a]">Tablero de Prospectos</h2>
            <p className="text-sm text-slate-500 mt-1">Gestiona el flujo de trámites y seguimientos</p>
          </div>
          <button className="bg-[#00006a] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-blue-900 transition-colors">
            + Nuevo Prospecto
          </button>
        </div>

        {/* Columnas */}
        <div className="flex gap-6 min-h-[70vh]">
          <div className="bg-slate-100 rounded-xl p-4 min-w-[300px] border border-slate-200 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-3 flex justify-between">
              Prospectos Nuevos <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs">0</span>
            </h3>
            <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm">
              Arrastra tarjetas aquí
            </div>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 min-w-[300px] border border-slate-200 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-3 flex justify-between">
              Asesoría / Documentos <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs">0</span>
            </h3>
            <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm">
              Arrastra tarjetas aquí
            </div>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 min-w-[300px] border border-slate-200 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-3 flex justify-between">
              Pagos Pendientes <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs">0</span>
            </h3>
            <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm">
              Arrastra tarjetas aquí
            </div>
          </div>

          <div className="bg-slate-100 rounded-xl p-4 min-w-[300px] border border-slate-200 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-3 flex justify-between">
              Trámite Finalizado <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs">0</span>
            </h3>
            <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm">
              Arrastra tarjetas aquí
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;