import { useEffect, useState, type MouseEvent } from 'react';
import { supabase } from './supabase';
import NuevoProspectoModal from './NuevoProspectoModal';
import EditarEstadoModal, { type ProspectoEditable } from './EditarEstadoModal';
import HistorialExcel from './HistorialExcel';

export default function TableroKanban() {
  const [prospectos, setProspectos] = useState<ProspectoEditable[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState<ProspectoEditable | null>(null);
  const [rolUsuario, setRolUsuario] = useState<string | null>(null);

  const [vistaActual, setVistaActual] = useState<'tablero' | 'historial'>('tablero');

  // Solo las 5 etapas activas: al llegar a "Finalizado", el expediente sale del tablero y pasa al Historial + Dashboard
  const columnas = [
    { id: 'Nuevos', aliases: ['Nuevos', 'Contactos / Informes'], titulo: '1. Contactos / Informes' },
    { id: 'Asesoria', aliases: ['Asesoria', 'Asesoría / Documentos'], titulo: '2. Asesoría / Documentos' },
    { id: 'Primer_Pago', aliases: ['Primer_Pago'], titulo: '3. Prospectos (Primer Pago)' },
    { id: 'Seguimiento', aliases: ['Seguimiento'], titulo: '4. Seguimiento General' },
    { id: 'Cita_Cierre', aliases: ['Cita_Cierre'], titulo: '5. Cita de Cierre' }
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
      if (data) setProspectos(data as ProspectoEditable[]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarDatosPrincipales();
  }, []);

  const abrirEditor = (prospecto: ProspectoEditable) => {
    setProspectoSeleccionado(prospecto);
    setIsEditModalOpen(true);
  };

  const eliminarProspecto = async (e: MouseEvent, id: string, nombre: string) => {
    e.stopPropagation();
    if (window.confirm(`⚠️ ¿Estás seguro de que deseas eliminar permanentemente a ${nombre}? Esta acción no se puede deshacer.`)) {
      try {
        const { error } = await supabase.from('prospectos').delete().eq('id', id);
        if (error) throw error;
        void cargarDatosPrincipales();
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Hubo un error al eliminar el registro.');
      }
    }
  };

  const totalFinalizados = prospectos.filter((p) => p.estado === 'Finalizado').length;

  if (cargando) {
    return (
      <div className="flex-1 flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00006a]"></div>
      </div>
    );
  }

  if (vistaActual === 'historial') {
    return <HistorialExcel onVolver={() => setVistaActual('tablero')} />;
  }

  return (
    <div className="p-6 flex flex-col h-full bg-slate-50">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#00006a]">Flujo Comercial (Trámites Activos)</h2>
          <p className="text-sm text-slate-500 mt-1">
            {rolUsuario === 'admin'
              ? 'Modo Administrador: Gestiona los trámites activos. Al finalizar un expediente se archiva automáticamente en el Historial.'
              : 'Modo Vendedor: Gestiona tus trámites activos dando clic en cada tarjeta.'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setVistaActual('historial')}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-emerald-700 transition-colors border border-emerald-800 flex items-center gap-2 cursor-pointer"
          >
            📊 Ver Historial Excel ({totalFinalizados} cerrados)
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#00006a] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-blue-900 transition-colors border border-blue-800 cursor-pointer"
          >
            + Nuevo Contacto
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 h-[70vh]">
        {columnas.map((columna) => {
          const prospectosColumna = prospectos.filter((p) =>
            columna.aliases.includes(p.estado || '')
          );

          return (
            <div key={columna.id} className="bg-slate-100 rounded-xl p-3 min-w-[270px] flex-1 border border-slate-200 flex flex-col">
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
                          type="button"
                          onClick={(e) => void eliminarProspecto(e, prospecto.id, prospecto.nombre_cliente)}
                          className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                          title="Eliminar registro"
                        >
                          🗑️
                        </button>
                      )}
                      <p className="font-bold text-[#00006a] group-hover:text-[#fa0101] transition-colors pr-6">
                        {prospecto.nombre_cliente}
                      </p>

                      <div className="flex justify-between items-center mb-3 mt-1 gap-2">
                        <p className="text-xs text-slate-500 font-medium">📞 {prospecto.telefono || 'S/N'}</p>
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1 text-right">
                          {prospecto.nacionalidad === 'Mexicana' ? '🇲🇽' : '🌍'} {prospecto.nacionalidad || 'General'}
                        </p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md uppercase tracking-wider">
                          {prospecto.tipo_tramite || 'General'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border ${
                            prospecto.estatus_pago === 'Liquidado'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : prospecto.estatus_pago === 'Abono_Inicial'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {prospecto.estatus_pago === 'Liquidado'
                            ? '✅ Liquidado'
                            : prospecto.estatus_pago === 'Abono_Inicial'
                            ? '💵 Abono Inicial'
                            : '⏳ Pago Pendiente'}
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

      <NuevoProspectoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGuardado={() => {
          setIsModalOpen(false);
          void cargarDatosPrincipales();
        }}
      />
      <EditarEstadoModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        prospecto={prospectoSeleccionado}
        onActualizado={() => {
          setIsEditModalOpen(false);
          void cargarDatosPrincipales();
        }}
      />
    </div>
  );
}