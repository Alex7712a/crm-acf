import React from 'react';
import { supabase } from './supabase';
import TableroKanban from './TableroKanban'; // ¡AQUÍ IMPORTAMOS EL NUEVO TABLERO FUNCIONAL!

interface DashboardProps {
  session: any;
  userRole?: string | null; // Tu variable de rol que viene desde App.tsx
}

function Dashboard({ session, userRole }: DashboardProps) {
  
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
          <div className="w-10 h-10 bg-white rounded-full overflow-hidden border-2 border-white">
            <img src="/Feliz_ACF.jpeg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-black tracking-wide">CRM <span className="text-[#fa0101]">ACF</span></h1>
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
        
        {/* Rescatamos tu botón secreto: Solo lo ven los administradores */}
        {userRole === 'admin' && (
          <div className="px-6 pt-4 flex justify-end">
            <button className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-slate-300 transition-colors border border-slate-300 flex items-center gap-2">
              ⚙️ Ajustes del Sistema
            </button>
          </div>
        )}

        {/* AQUÍ BORRAMOS LAS COLUMNAS ESTÁTICAS Y LLAMAMOS A NUESTRO TABLERO REAL */}
        <div className="flex-1">
          <TableroKanban />
        </div>

      </main>
    </div>
  );
}

export default Dashboard;