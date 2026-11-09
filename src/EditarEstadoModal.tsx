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
  
  // Estatus de decisión/calificación
  const [estatusConfirmacion, setEstatusConfirmacion] = useState('Analizando');
  const [estatusDocs, setEstatusDocs] = useState('Pendientes');
  const [estatusPago, setEstatusPago] = useState('Pendiente');
  const [estatusCita, setEstatusCita] = useState('Sin_Agendar');
  const [resultadoTramite, setResultadoTramite] = useState('En_Proceso');

  // Bitácora y Fechas de Seguimiento
  const [tipoInteraccion, setTipoInteraccion] = useState('Llamada');
  const [fechaInteraccion, setFechaInteraccion] = useState(new Date().toISOString().split('T')[0]);
  const [detallesInteraccion, setDetallesInteraccion] = useState('');
  const [proximoRecontacto, setProximoRecontacto] = useState('');
  const [historialActividades, setHistorialActividades] = useState<any[]>([]);

  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (prospecto) {
      setEstado(prospecto.estado || 'Nuevos');
      setEstatusDocs(prospecto.estatus_documentos || 'Pendientes');
      setEstatusPago(prospecto.estatus_pago || 'Pendiente');
      setEstatusCita(prospecto.estatus_cita || 'Sin_Agendar');
      setResultadoTramite(prospecto.resultado_tramite || 'En_Proceso');
      setEstatusConfirmacion('Analizando');
      setDetallesInteraccion('');
      setProximoRecontacto('');
      cargarBitacora(prospecto.id);
    }
  }, [prospecto]);

  const cargarBitacora = async (idProspecto: string) => {
    const { data } = await supabase
      .from('actividades')
      .select('*')
      .eq('prospecto_id', idProspecto)
      .order('fecha_interaccion', { ascending: false });

    if (data) setHistorialActividades(data);
  };

  if (!isOpen || !prospecto) return null;

  // Lógica interactiva cuando el cliente confirma o pide tiempo
  const handleCambioConfirmacion = (nuevoEstatus: string) => {
    setEstatusConfirmacion(nuevoEstatus);
    if (nuevoEstatus === 'Confirmado_SI' && estado === 'Nuevos') {
      setEstado('Asesoria'); // Se manda directo a Documentos para iniciar trámite
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const etapasAvanzadas = ['Primer_Pago', 'Seguimiento', 'Cita_Cierre', 'Finalizado'];
    if (etapasAvanzadas.includes(estado) && estatusDocs === 'Pendientes') {
      alert("⚠️ Validación:\nNo puedes mover al cliente a pagos o citas si los documentos siguen marcados como pendientes.");
      return;
    }

    setGuardando(true);

    try {
      // 1. Actualizar el estatus principal en Supabase
      const { error: updateError } = await supabase
        .from('prospectos')
        .update({ 
          estado,
          estatus_documentos: estatusDocs,
          estatus_pago: estatusPago,
          estatus_cita: estatusCita,
          resultado_tramite: resultadoTramite
        })
        .eq('id', prospecto.id);

      if (updateError) throw updateError;

      // 2. Guardar interacción en la bitácora si hay notas o fecha futura
      if (detallesInteraccion.trim() || proximoRecontacto) {
        await supabase.from('actividades').insert([
          {
            prospecto_id: prospecto.id,
            tipo_interaccion: tipoInteraccion,
            fecha_interaccion: fechaInteraccion,
            detalles: detallesInteraccion.trim() || 'Actualización de estatus en el sistema.',
            proximo_recontacto: proximoRecontacto || null
          }
        ]);
      }

      // 3. Notificación interactiva al usuario
      if (estatusConfirmacion === 'Confirmado_SI') {
        alert("🎉 ¡Excelente! El cliente ha confirmado el SÍ y avanzó a la etapa de Asesoría/Documentos.");
      } else if (proximoRecontacto) {
        alert(`📅 Acercamiento registrado. El prospecto se agendó para seguimiento en la fecha: ${proximoRecontacto}`);
      }

      // 4. Si el trámite finaliza, lo guarda en el Historial Excel
      if (estado === 'Finalizado') {
        await supabase.from('historial_clientes').insert([
          {
            nombre_cliente: prospecto.nombre_cliente,
            telefono: prospecto.telefono || 'S/N',
            nacionalidad: prospecto.nacionalidad || 'Mexicana',
            tipo_tramite: prospecto.tipo_tramite || 'Visa de Turista',
            tipo_paquete: prospecto.tipo_paquete || 'Completo',
            resultado: resultadoTramite === 'Aprobado' ? 'Aprobado' : 'Denegado',
            notas: `Trámite finalizado con resultado: ${resultadoTramite}`
          }
        ]);
      }

      onActualizado();
      onClose();
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Encabezado */}
        <div className="bg-[#00006a] p-5 text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black tracking-wide">📞 Gestión de Acercamientos y Bitácora</h2>
            <p className="text-blue-200 text-xs mt-0.5">{prospecto.nombre_cliente} • 📞 {prospecto.telefono}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-red-300 font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto bg-slate-50 flex-1">
          
          {/* Selector de Etapa Comercial */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase">Etapa del Trámite:</span>
            <select value={estado} onChange={e => setEstado(e.target.value)} 
              className="border-2 border-[#00006a] p-2 rounded-xl text-sm font-bold text-[#00006a] bg-white outline-none">
              <option value="Nuevos">1. Contactos / Informes (Primer Contacto)</option>
              <option value="Asesoria">2. Asesoría / Documentos (En Trámite Active)</option>
              <option value="Primer_Pago">3. Primer Pago</option>
              <option value="Seguimiento">4. Seguimiento General</option>
              <option value="Cita_Cierre">5. Cita de Cierre</option>
              <option value="Finalizado">6. Finalizado</option>
            </select>
          </div>

          {/* 🎯 CALIFICACIÓN RÁPIDA (Trámite Inmediato vs. Paso Lento) */}
          {estado === 'Nuevos' && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-2">
              <span className="text-xs font-bold text-blue-900 uppercase">🤝 Resultado de la Llamada / Acercamiento</span>
              <select value={estatusConfirmacion} onChange={e => handleCambioConfirmacion(e.target.value)} 
                className="w-full border border-blue-300 p-2 rounded-lg bg-white text-xs font-bold text-slate-700">
                <option value="Analizando">⏳ Lo pensará / Recontactar a futuro (Próximo año o semanas)</option>
                <option value="Confirmado_SI">⚡ ¡SÍ CONFIRMÓ DE INMEDIATO! (Mover a Documentos)</option>
                <option value="No_Interesado">❌ No interesado</option>
              </select>

              {estatusConfirmacion === 'Confirmado_SI' && (
                <p className="text-[11px] text-emerald-700 font-bold mt-1">
                  ✨ Al guardar, el cliente pasará directo al Kanban en la columna "Asesoría / Documentos".
                </p>
              )}
            </div>
          )}

          {/* Bloques condicionales según etapa */}
          {estado === 'Asesoria' && (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2">
              <span className="text-xs font-bold text-amber-900 uppercase">📁 Estado de Documentación</span>
              <select value={estatusDocs} onChange={e => setEstatusDocs(e.target.value)} 
                className="w-full border border-amber-300 p-2 rounded-lg bg-white text-xs font-medium text-slate-700">
                <option value="Pendientes">⏳ Esperando envío de documentos</option>
                <option value="Fotos_Recibidas">📱 Recibidos por WhatsApp (Fotos)</option>
                <option value="Escaneados">🖨️ Recibidos Escaneados (PDF)</option>
                <option value="Fisicos">📂 Entregados Físicamente en Oficina</option>
              </select>
            </div>
          )}

          {(estado === 'Primer_Pago' || estado === 'Seguimiento') && (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 space-y-2">
              <span className="text-xs font-bold text-emerald-900 uppercase">💰 Estado de Pagos</span>
              <select value={estatusPago} onChange={e => setEstatusPago(e.target.value)} 
                className="w-full border border-emerald-300 p-2 rounded-lg bg-white text-xs font-medium text-slate-700">
                <option value="Pendiente">❌ Pendiente de Pago</option>
                <option value="Abono_Inicial">💵 Abono Inicial Realizado</option>
                <option value="Liquidado">✅ Trámite Liquidado</option>
              </select>
            </div>
          )}

          {/* 📝 REGISTRO DE BITÁCORA Y FECHA FUTURA */}
          <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-3">
            <span className="text-xs font-bold text-indigo-900 uppercase">📝 Bitácora de Llamada y Agendado</span>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Tipo de Contacto</label>
                <select value={tipoInteraccion} onChange={e => setTipoInteraccion(e.target.value)}
                  className="w-full border border-slate-300 p-2 rounded-lg mt-1 bg-white text-xs">
                  <option value="Llamada">📞 Llamada Telefónica</option>
                  <option value="WhatsApp">💬 Mensaje de WhatsApp</option>
                  <option value="Oficina">🏢 Visita a Oficina</option>
                  <option value="Seguimiento">⏰ Seguimiento Programado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">📅 Próximo Recontacto (Para la Agenda)</label>
                <input type="date" value={proximoRecontacto} onChange={e => setProximoRecontacto(e.target.value)}
                  className="w-full border border-slate-300 p-2 rounded-lg mt-1 bg-white text-xs font-semibold text-indigo-900" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Notas de lo conversado</label>
              <textarea rows={2} value={detallesInteraccion} onChange={e => setDetallesInteraccion(e.target.value)}
                placeholder="Ej. Dice que iniciará trámite el próximo año (Enero 2027) / Pidió 2 semanas para juntar el dinero..."
                className="w-full border border-slate-300 p-2 rounded-lg mt-1 bg-white text-xs" />
            </div>

            {/* Historial acumulado */}
            {historialActividades.length > 0 && (
              <div className="space-y-1.5 max-h-28 overflow-y-auto pt-2 border-t border-indigo-100">
                <p className="text-[11px] font-bold text-indigo-900">Historial previo registrado:</p>
                {historialActividades.map((act) => (
                  <div key={act.id} className="bg-white p-2 rounded border border-indigo-100 text-xs">
                    <span className="font-bold text-indigo-800">[{act.fecha_interaccion}] - {act.tipo_interaccion}:</span> {act.detalles}
                    {act.proximo_recontacto && (
                      <span className="text-[10px] font-bold text-amber-700 block mt-0.5">📅 Programado para: {act.proximo_recontacto}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-bold rounded-xl hover:bg-slate-200 text-xs">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-5 py-2 bg-[#fa0101] text-white rounded-xl font-bold hover:bg-[#d00000] shadow-md text-xs">
              {guardando ? '⏳ Guardando...' : '💾 Guardar Registro'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}