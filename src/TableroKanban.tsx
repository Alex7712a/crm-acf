import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import NuevoProspectoModal from './NuevoProspectoModal';
import EditarEstadoModal from './EditarEstadoModal';
import HistorialExcel from './HistorialExcel'; // IMPORTAMOS LA NUEVA PANTALLA

interface Prospecto {
  id: string;
  nombre_cliente: string;
  telefono: string;
  nacionalidad: string;
  estado: string;
  tipo_tramite: string;
  modalidad_cita: string;
}

export default function TableroKanban() {
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState<Prospecto | null>(null);
  const [rolUsuario, setRolUsuario] = useState<string | null>(null);

  // NUEVO: Variable para cambiar entre el Tablero y el Historial
  const [vistaActual, setVistaActual] = useState<'tablero' | 'historial'>('tablero');

  const columnas = [
    { id: 'Nuevos', titulo: 'Contactos / Informes' },
    { id: 'Asesoria', titulo: 'Asesoría / Documentos' },
    { id: 'Primer_Pago', titulo: 'Prospectos (Primer Pago)' },
    { id: 'Seguimiento', titulo: 'Seguimiento General' },
    { id: 'Cita_Cierre', titulo: 'Cita de Cierre' },
    { id: 'Finalizado', titulo: 'Trámite Finalizado' }
  ];

  const cargarDatosPrincipales = async () => {
    try {
      setCargando(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', session.user.id)
          .single();
        if (perfil) setRolUsuario(perfil.rol);
      }

      const { data, error } = await supabase
        .from('prospectos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setProspectos(data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosPrincipales();
  }, []);

  const abrirEditor = (prospecto: Prospecto) => {
    setProspectoSeleccionado(prospecto);
    setIsEditModalOpen(true);
  };

  const eliminarProspecto = async (e: React.MouseEvent, id: string, nombre: string) => {
    e.stopPropagation();
    if (window.confirm(`⚠️ ¿Estás seguro de que deseas eliminar permanentemente a ${nombre}? Esta acción no se puede deshacer.`)) {
      try {
        const { error } = await supabase.from('prospectos').delete().eq('id', id);
        if (error) throw error;
        cargarDatosPrincipales();
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("Hubo un error al eliminar el registro.");
      }
    }
  };

  if (cargando) return (
    <div className="flex-1 flex justify-center items-center h-[70vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00006a]"></div>
    </div>
  );

  // SI LA VISTA ESTÁ EN HISTORIAL, MOSTRAMOS LA PANTALLA NUEVA
  if (vistaActual === 'historial') {
    return <HistorialExcel onVolver={() => setVistaActual('tablero')} />;
  }

  // SI NO, MOSTRAMOS EL TABLERO KANBAN NORMAL
  return (
    <div className="p-6 flex flex-col h-full bg-slate-50">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#00006a]">Flujo Comercial</h2>
          <p className="text-sm text-slate-500 mt-1">
            {rolUsuario === 'admin' 
              ? 'Modo Administrador: Tienes permisos para gestionar el sistema.' 
              : 'Modo Vendedor: Gestiona tus trámites arrastrando o dando clic.'}
          </p>
        </div>
        
        <div className="flex gap-3">
          {rolUsuario === 'admin' && (
            <button 
              onClick={() => setVistaActual('historial')} // AQUÍ CONECTAMOS EL BOTÓN VERDE
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-colors border border-emerald-800 flex items-center gap-2"
            >
              📊 Ver Historial Excel
            </button>
          )}

          {rolUsuario === 'vendedor' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#00006a] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-blue-900 transition-colors border border-blue-800"
            >
              + Nuevo Contacto
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 h-[70vh]">
        {columnas.map((columna) => {
          const prospectosColumna = prospectos.filter((p) => p.estado === columna.id);

          return (
            <div key={columna.id} className="bg-slate-100 rounded-xl p-3 min-w-[260px] w-[260px] border border-slate-200 flex flex-col">
              <h3 className="font-bold text-slate-700 mb-4 flex justify-between items-center border-b border-slate-200 pb-2 text-sm">
                {columna.titulo}
                <span className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-black">
                  {prospectosColumna.length}
                </span>
              </h3>
              
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
                {prospectosColumna.length === 0 ? (
                  <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                    Vacío
                  </div>
                ) : (
                  prospectosColumna.map((prospecto) => (
                    <div 
                      key={prospecto.id} 
                      onClick={() => abrirEditor(prospecto)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-[#00006a] transition-all cursor-pointer group relative"
                    >
                      {rolUsuario === 'admin' && (
                        <button 
                          onClick={(e) => eliminarProspecto(e, prospecto.id, prospecto.nombre_cliente)}
                          className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"
                          title="Eliminar registro"
                        >
                          🗑️
                        </button>
                      )}
                      <p className="font-bold text-[#00006a] group-hover:text-[#fa0101] transition-colors pr-6">{prospecto.nombre_cliente}</p>
                      
                      <div className="flex justify-between items-center mb-3 mt-1">
                        <p className="text-sm text-slate-500 font-medium">📞 {prospecto.telefono || 'S/N'}</p>
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          {prospecto.nacionalidad === 'Mexicana' ? '🇲🇽' : '🌍'} {prospecto.nacionalidad}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md uppercase tracking-wider">
                          {prospecto.tipo_tramite}
                        </span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-md uppercase tracking-wider">
                          {prospecto.modalidad_cita.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <NuevoProspectoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onGuardado={() => { setIsModalOpen(false); cargarDatosPrincipales(); }} />
      <EditarEstadoModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} prospecto={prospectoSeleccionado} onActualizado={() => { setIsEditModalOpen(false); cargarDatosPrincipales(); }} />
    </div>
  );
}