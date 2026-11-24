import { useState } from 'react';
import { supabase } from './supabase';
import TableroKanban from './TableroKanban';
import AgendaRecordatorios from './AgendaRecordatorios';
import HistorialExcel from './HistorialExcel';
import DashboardIndicadores from './DashboardIndicadores';

interface DashboardProps {
  session: any;
  userRole?: string | null;
}

interface PerfilUsuario {
  id: string;
  rol: string;
  nombre_completo?: string;
  nombre?: string;
  email?: string;
  correo?: string;
  telefono?: string;
}

function Dashboard({ session, userRole }: DashboardProps) {
  const [vistaActiva, setVistaActiva] = useState<'kanban' | 'agenda' | 'indicadores' | 'excel'>('kanban');

  // Estados para la ventana de Ajustes del Sistema
  const [isAjustesOpen, setIsAjustesOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<PerfilUsuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const [errorAjustes, setErrorAjustes] = useState<string | null>(null);
  const [codigoCopiado, setCodigoCopiado] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const cargarUsuarios = async () => {
    try {
      setCargandoUsuarios(true);
      setErrorAjustes(null);
      const { data, error } = await supabase
        .from('perfiles')
        .select('*');

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setErrorAjustes('No se pudo cargar la lista de usuarios. Revisa los permisos en Supabase.');
    } finally {
      setCargandoUsuarios(false);
    }
  };

  const abrirAjustes = () => {
    setIsAjustesOpen(true);
    cargarUsuarios();
  };

  const cambiarRolUsuario = async (usuarioId: string, rolActual: string) => {
    const nuevoRol = rolActual === 'admin' ? 'vendedor' : 'admin';
    try {
      setActualizandoId(usuarioId);
      setErrorAjustes(null);

      const { data, error } = await supabase
        .from('perfiles')
        .update({ rol: nuevoRol })
        .eq('id', usuarioId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        setErrorAjustes('Supabase bloqueó el cambio por políticas RLS. Ejecuta el permiso de administrador en el SQL Editor.');
        return;
      }

      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, rol: nuevoRol } : u))
      );
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      setErrorAjustes('Hubo un error al cambiar el rol del usuario.');
    } finally {
      setActualizandoId(null);
    }
  };

  const copiarCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCodigoCopiado(codigo);
    setTimeout(() => setCodigoCopiado(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* ==========================================
          BARRA SUPERIOR (Tus estilos y logo) 
          ========================================== */}
      <nav className="bg-[#00006a] text-white p-4 shadow-md flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full overflow-hidden border-2 border-white shadow-sm">
            <img src="/Feliz_ACF.jpeg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-black tracking-wide">CRM <span className="text-[#fa0101]">ACF</span></h1>
        </div>

        {/* MENÚ DE PESTAÑAS */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-1.5 rounded-xl border border-white/10">
          <button 
            onClick={() => setVistaActiva('kanban')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vistaActiva === 'kanban' 
                ? 'bg-white text-[#00006a] shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}>
            📊 Flujo Comercial (Kanban)
          </button>

          <button 
            onClick={() => setVistaActiva('agenda')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vistaActiva === 'agenda' 
                ? 'bg-[#fa0101] text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}>
            📅 Agenda & Recordatorios
          </button>

          <button 
            onClick={() => setVistaActiva('indicadores')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vistaActiva === 'indicadores' 
                ? 'bg-indigo-500 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}>
            📈 Dashboard & Indicadores
          </button>

          <button 
            onClick={() => setVistaActiva('excel')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              vistaActiva === 'excel' 
                ? 'bg-emerald-500 text-white shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}>
            📁 Base Histórica (Excel)
          </button>
        </div>
        
        <div className="flex items-center gap-5">
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
            className="bg-[#fa0101] hover:bg-white hover:text-[#fa0101] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* ==========================================
          CONTENEDOR PRINCIPAL DEL SISTEMA 
          ========================================== */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Botón funcional de Administrador */}
        {userRole === 'admin' && (
          <div className="px-6 pt-4 flex justify-end">
            <button 
              onClick={abrirAjustes}
              className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-slate-300 transition-colors border border-slate-300 flex items-center gap-2 cursor-pointer"
            >
              ⚙️ Ajustes del Sistema
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {vistaActiva === 'kanban' && <TableroKanban />}
          {vistaActiva === 'agenda' && (
            <AgendaRecordatorios 
              onAbrirProspecto={() => {
                setVistaActiva('kanban');
              }} 
            />
          )}
          {vistaActiva === 'indicadores' && <DashboardIndicadores />}
          {vistaActiva === 'excel' && (
            <HistorialExcel 
              onVolver={() => setVistaActiva('kanban')} 
            />
          )}
        </div>

      </main>

      {/* ==========================================
          MODAL DE AJUSTES DEL SISTEMA (SOLO ADMIN)
          ========================================== */}
      {isAjustesOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            
            {/* Encabezado */}
            <div className="bg-[#00006a] text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">⚙️ Ajustes del Sistema</h2>
                <p className="text-xs text-slate-300">Gestión de equipo, roles y claves de acceso ACF</p>
              </div>
              <button
                onClick={() => setIsAjustesOpen(false)}
                className="text-slate-300 hover:text-white text-xl font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Claves de registro */}
              <div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                  Claves de Registro para Nuevo Personal
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-blue-900">Perfil Vendedor</p>
                      <p className="text-base font-black text-[#00006a] tracking-widest">ACF2026</p>
                    </div>
                    <button
                      onClick={() => copiarCodigo('ACF2026')}
                      className="bg-white text-[#00006a] border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 cursor-pointer"
                    >
                      {codigoCopiado === 'ACF2026' ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-red-900">Perfil Administrador</p>
                      <p className="text-base font-black text-[#fa0101] tracking-widest">ACFADMIN2026</p>
                    </div>
                    <button
                      onClick={() => copiarCodigo('ACFADMIN2026')}
                      className="bg-white text-[#fa0101] border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 cursor-pointer"
                    >
                      {codigoCopiado === 'ACFADMIN2026' ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Gestión de usuarios */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Usuarios Registrados ({usuarios.length})
                  </h3>
                  <button
                    onClick={cargarUsuarios}
                    className="text-xs font-bold text-[#00006a] hover:underline cursor-pointer"
                  >
                    ↻ Actualizar lista
                  </button>
                </div>

                {errorAjustes && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl">
                    ⚠️ {errorAjustes}
                  </div>
                )}

                {cargandoUsuarios ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00006a]"></div>
                  </div>
                ) : usuarios.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                    No se encontraron usuarios registrados.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {usuarios.map((u) => {
                      const esMiCuenta = u.id === session?.user?.id;
                      const nombreMostrar = u.nombre_completo || u.nombre || 'Usuario ACF';
                      const correoMostrar = u.email || u.correo || (esMiCuenta ? session?.user?.email : u.id.slice(0, 8) + '...');

                      return (
                        <div key={u.id} className="p-3.5 bg-white flex flex-wrap justify-between items-center gap-3 hover:bg-slate-50">
                          <div>
                            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              {nombreMostrar}
                              {esMiCuenta && (
                                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                  Tú
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {correoMostrar} {u.telefono ? `• ${u.telefono}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                              u.rol === 'admin'
                                ? 'bg-red-100 text-[#fa0101]'
                                : 'bg-blue-100 text-[#00006a]'
                            }`}>
                              {u.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                            </span>

                            <button
                              disabled={esMiCuenta || actualizandoId === u.id}
                              onClick={() => cambiarRolUsuario(u.id, u.rol)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                esMiCuenta
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-[#00006a] hover:text-white hover:border-[#00006a] cursor-pointer'
                              }`}
                            >
                              {actualizandoId === u.id
                                ? 'Guardando...'
                                : u.rol === 'admin'
                                ? 'Cambiar a Vendedor'
                                : 'Hacer Admin'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pie del modal */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsAjustesOpen(false)}
                className="bg-[#00006a] text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;