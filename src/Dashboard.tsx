import React, { useState } from 'react';
import { supabase } from './supabase';
import TableroKanban from './TableroKanban';
import AgendaRecordatorios from './AgendaRecordatorios';
import HistorialExcel from './HistorialExcel'; // 👈 Importamos el módulo de historial Excel

interface DashboardProps {
  session: any;
  userRole?: string | null;
}

function Dashboard({ session, userRole }: DashboardProps) {
  // Estado para alternar entre el Tablero Comercial, la Agenda y el Historial Excel ('kanban' | 'agenda' | 'excel')
  const [vistaActiva, setVistaActiva] = useState<'kanban' | 'agenda' | 'excel'>('kanban');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* ==========================================
          BARRA SUPERIOR INTACTA (Tus estilos y logo) 
          ========================================== */}
      <nav className="bg-[#00006a] text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full overflow-hidden border-2 border-white shadow-sm">
            <img src="/Feliz_ACF.jpeg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-black tracking-wide">CRM <span className="text-[#fa0101]">ACF</span></h1>
        </div>

        {/* 🧭 MENÚ DE PESTAÑAS (Para navegar entre Kanban, Agenda y Excel) */}
        <div className="flex items-center gap-2 bg-slate-900/40 p-1.5 rounded-xl border border-white/10">
          <button 
            onClick={() => setVistaActiva('kanban')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vistaActiva === 'kanban' 
                ? 'bg-white text-[#00006a] shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}>
            📊 Flujo Comercial (Kanban)
          </button>

          <button 
            onClick={() => setVistaActiva('agenda')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vistaActiva === 'agenda' 
                ? 'bg-[#fa0101] text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}>
            📅 Agenda & Recordatorios
          </button>

          <button 
            onClick={() => setVistaActiva('excel')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vistaActiva === 'excel' 
                ? 'bg-emerald-500 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}>
            📁 Base de Datos Histórica (Excel)
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col text-right">
            <span className="text-sm font-medium text-slate-200">
              Usuario: {session?.user?.email}
            </span>
            <span className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full inline-block w-max self-end ${
              userRole === 'admin' 
                ? 'bg-[#fa0101] text-white' 
                : 'bg-blue-400 text-[#00006a]'
            }`}>
              Perfil: {userRole === 'admin' ? 'Administrador' : 'Vendedor'}
            </span>
          </div>
          
          <button 
            onClick={handleLogout}
            className="bg-[#fa0101] hover:bg-white hover:text-[#fa0101] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* ==========================================
          CONTENEDOR PRINCIPAL DEL SISTEMA 
          ========================================== */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Rescatamos tu botón secreto de Administrador */}
        {userRole === 'admin' && (
          <div className="px-6 pt-4 flex justify-end">
            <button className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-slate-300 transition-colors border border-slate-300 flex items-center gap-2">
              ⚙️ Ajustes del Sistema
            </button>
          </div>
        )}

        {/* AQUÍ CAMBIAMOS DINÁMICAMENTE ENTRE EL KANBAN, LA AGENDA Y EL HISTORIAL EXCEL */}
        <div className="flex-1 overflow-y-auto">
          {vistaActiva === 'kanban' && <TableroKanban />}
          {vistaActiva === 'agenda' && (
            <AgendaRecordatorios 
              onAbrirProspecto={(prospecto) => {
                setVistaActiva('kanban');
              }} 
            />
          )}
          {vistaActiva === 'excel' && (
            <HistorialExcel 
              onVolver={() => setVistaActiva('kanban')} 
            />
          )}
        </div>

      </main>
    </div>
  );
}

export default Dashboard