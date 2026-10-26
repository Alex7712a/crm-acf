import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prospecto: any;
  onActualizado: () => void;
}

export default function EditarEstadoModal({ isOpen, onClose, prospecto, onActualizado }: Props) {
  const [estado, setEstado] = useState('');
  
  // Variables para la "Memoria" de la ventana inteligente
  const [estatusDocs, setEstatusDocs] = useState('Pendientes');
  const [estatusCita, setEstatusCita] = useState('Sin_Agendar');
  const [estatusPago, setEstatusPago] = useState('Pendiente');
  const [resultadoTramite, setResultadoTramite] = useState('En_Proceso');
  
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (prospecto) {
      setEstado(prospecto.estado || 'Nuevos');
      setEstatusDocs(prospecto.estatus_documentos || 'Pendientes');
      setEstatusCita(prospecto.estatus_cita || 'Sin_Agendar');
      setEstatusPago(prospecto.estatus_pago || 'Pendiente');
      setResultadoTramite(prospecto.resultado_tramite || 'En_Proceso');
    }
  }, [prospecto]);

  if (!isOpen || !prospecto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ==========================================
    // NUEVA VALIDACIÓN DE NEGOCIO (SEMANA 9)
    // ==========================================
    // Si intenta pasarlo a etapas avanzadas pero los documentos siguen pendientes
    const etapasAvanzadas = ['Primer_Pago', 'Seguimiento', 'Cita_Cierre', 'Finalizado'];
    const documentosPendientes = estatusDocs === 'Pendientes';

    if (etapasAvanzadas.includes(estado) && documentosPendientes) {
      alert("⚠️ Validación del Sistema:\nNo puedes avanzar al prospecto a esta etapa si los documentos siguen marcados como 'Aún no envía documentos'. Por favor actualiza el estatus documental primero.");
      return; // Detiene el guardado
    }
    // ==========================================

    setGuardando(true);

    try {
      const { error } = await supabase
        .from('prospectos')
        .update({ 
          estado: estado,
          estatus_documentos: estatusDocs,
          estatus_cita: estatusCita,
          estatus_pago: estatusPago,
          resultado_tramite: resultadoTramite
        })
        .eq('id', prospecto.id);

      if (error) throw error;
      
      onActualizado();
    } catch (error: any) {
      console.error("Error al actualizar estado:", error);
      alert(`Error al actualizar:\n${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 transition-all">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        
        <div className="bg-[#00006a] p-5 text-white">
          <h2 className="text-xl font-black tracking-wide flex items-center gap-2">
            🔄 Gestionar Trámite
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 bg-slate-50 overflow-y-auto max-h-[80vh]">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="font-bold text-[#00006a] text-lg">{prospecto.nombre_cliente}</p>
            <p className="text-sm font-medium text-slate-600">Servicio solicitado: {prospecto.tipo_tramite}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">Mover a la Etapa:</label>
            <select value={estado} onChange={e => setEstado(e.target.value)} 
              className="w-full border border-[#00006a] p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white font-bold text-[#00006a]">
              <option value="Nuevos">Contactos / Informes</option>
              <option value="Asesoria">Asesoría / Documentos</option>
              <option value="Primer_Pago">Prospectos (Primer Pago)</option>
              <option value="Seguimiento">Seguimiento General</option>
              <option value="Cita_Cierre">Cita de Cierre</option>
              <option value="Finalizado">Trámite Finalizado</option>
            </select>
          </div>

          {/* ----- LÓGICA INTELIGENTE ----- */}

          {/* 1. SECCIÓN DE DOCUMENTOS (Solo se ve al inicio) */}
          {(estado === 'Nuevos' || estado === 'Asesoria') && (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 animate-fade-in">
              <label className="block text-sm font-bold text-amber-900">📋 Recepción de Documentos:</label>
              <select value={estatusDocs} onChange={e => setEstatusDocs(e.target.value)} 
                className="w-full border border-amber-300 p-2.5 rounded-xl mt-2 outline-none shadow-sm bg-white font-medium text-slate-700">
                <option value="Pendientes">⏳ Aún no envía documentos</option>
                <option value="Fotos_Recibidas">📱 Recibidos por Foto (WhatsApp)</option>
                <option value="Escaneados">🖨️ Recibidos Escaneados (PDF)</option>
                <option value="Fisicos">📂 Entregados en Físico</option>
              </select>
            </div>
          )}

          {/* 2. SECCIÓN DE PAGOS (Se ve a la mitad del proceso) */}
          {(estado === 'Primer_Pago' || estado === 'Seguimiento') && (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 animate-fade-in">
              <label className="block text-sm font-bold text-emerald-900">💰 Estatus Financiero:</label>
              <select value={estatusPago} onChange={e => setEstatusPago(e.target.value)} 
                className="w-full border border-emerald-300 p-2.5 rounded-xl mt-2 outline-none shadow-sm bg-white font-medium text-slate-700">
                <option value="Pendiente">❌ Aún no realiza pago</option>
                <option value="Abono_Inicial">💵 Abono Inicial (Parcial)</option>
                <option value="Medio_Pago">💸 Pago del 50%</option>
                <option value="Liquidado">✅ Trámite Liquidado 100%</option>
              </select>
            </div>
          )}

          {/* 3. SECCIÓN DE CITAS (Se ve casi al final) */}
          {(estado === 'Cita_Cierre') && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 animate-fade-in">
              <label className="block text-sm font-bold text-blue-900">📅 Estatus de la Cita:</label>
              <select value={estatusCita} onChange={e => setEstatusCita(e.target.value)} 
                className="w-full border border-blue-300 p-2.5 rounded-xl mt-2 outline-none shadow-sm bg-white font-medium text-slate-700">
                <option value="Sin_Agendar">⏳ Aún sin fecha agendada</option>
                <option value="Agendada">📅 Cita Agendada y Confirmada</option>
                <option value="Asistio">✅ Cliente asistió a la cita</option>
                <option value="Cancelada">🚫 Cita Cancelada / Reprogramar</option>
              </select>
            </div>
          )}

          {/* 4. SECCIÓN DE RESULTADO FINAL (Se ve en la última columna) */}
          {(estado === 'Finalizado') && (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 animate-fade-in">
              <label className="block text-sm font-bold text-purple-900">🏆 Resultado del Trámite:</label>
              <select value={resultadoTramite} onChange={e => setResultadoTramite(e.target.value)} 
                className="w-full border border-purple-300 p-2.5 rounded-xl mt-2 outline-none shadow-sm bg-white font-medium text-slate-700">
                <option value="En_Proceso">⏳ Esperando confirmación del cliente</option>
                <option value="Aprobado">🎉 Trámite Exitoso (El cliente confirmó)</option>
                <option value="Rechazado">❌ Trámite No Realizado / Sin Éxito</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} 
              className="px-5 py-2.5 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} 
              className="px-5 py-2.5 bg-[#fa0101] text-white rounded-xl font-bold hover:bg-[#d00000] shadow-md transition-colors disabled:bg-red-300">
              {guardando ? '⏳ Guardando...' : '✅ Actualizar Cliente'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}