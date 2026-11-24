import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from './supabase';

export interface ProspectoEditable {
  id: string;
  nombre_cliente: string;
  telefono?: string | null;
  nacionalidad?: string | null;
  estado?: string | null;
  tipo_tramite?: string | null;
  tipo_paquete?: string | null;
  modalidad_cita?: string | null;
  estatus_documentos?: string | null;
  estatus_pago?: string | null;
  estatus_cita?: string | null;
  resultado_tramite?: string | null;
  vendedor_nombre?: string | null;
  titular_estado_eeuu?: string | null;
  medio_contacto?: string | null;
  familiar_nombre?: string | null;
  familiar_pais?: string | null;
  familiar_estado?: string | null;
}

interface Actividad {
  id: string;
  fecha_interaccion: string;
  tipo_interaccion: string;
  detalles: string;
  proximo_recontacto?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prospecto: ProspectoEditable | null;
  onActualizado: () => void;
}

const ETAPAS_CON_PAGO = ['Primer_Pago', 'Seguimiento', 'Cita_Cierre', 'Finalizado'];

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
  const fechaInteraccion = new Date().toISOString().split('T')[0];
  const [detallesInteraccion, setDetallesInteraccion] = useState('');
  const [proximoRecontacto, setProximoRecontacto] = useState('');
  const [historialActividades, setHistorialActividades] = useState<Actividad[]>([]);

  const [guardando, setGuardando] = useState(false);

  const cargarBitacora = async (idProspecto: string) => {
    const { data } = await supabase
      .from('actividades')
      .select('*')
      .eq('prospecto_id', idProspecto)
      .order('fecha_interaccion', { ascending: false });

    if (data) setHistorialActividades(data as Actividad[]);
  };

  useEffect(() => {
    if (prospecto) {
      const estadoInicial =
        prospecto.estado === 'Contactos / Informes'
          ? 'Nuevos'
          : prospecto.estado || 'Nuevos';
      setEstado(estadoInicial);
      setEstatusDocs(prospecto.estatus_documentos || 'Pendientes');
      setEstatusPago(prospecto.estatus_pago || 'Pendiente');
      setEstatusCita(prospecto.estatus_cita || 'Sin_Agendar');
      setResultadoTramite(prospecto.resultado_tramite || 'En_Proceso');
      setEstatusConfirmacion('Analizando');
      setDetallesInteraccion('');
      setProximoRecontacto('');
      void cargarBitacora(prospecto.id);
    }
  }, [prospecto]);

  if (!isOpen || !prospecto) return null;

  const esFinalizado = estado === 'Finalizado';
  const esDenegado = esFinalizado && resultadoTramite === 'Denegado';
  const faltaResultadoFinal = esFinalizado && resultadoTramite === 'En_Proceso';
  const requiereLiquidacion =
    esFinalizado && resultadoTramite === 'Aprobado' && estatusPago !== 'Liquidado';
  const requierePagoYEstaPendiente =
    ETAPAS_CON_PAGO.includes(estado) && estatusPago === 'Pendiente' && !esDenegado;

  const handleCambioEstado = (nuevoEstado: string) => {
    setEstado(nuevoEstado);
    if (nuevoEstado === 'Finalizado') {
      setProximoRecontacto('');
    }
  };

  const handleCambioConfirmacion = (nuevoEstatus: string) => {
    setEstatusConfirmacion(nuevoEstatus);
    if (nuevoEstatus === 'Confirmado_SI' && (estado === 'Nuevos' || estado === 'En Pausa / Agenda')) {
      setEstado('Asesoria');
    } else if (nuevoEstatus === 'No_Interesado') {
      setEstado('No_Interesado');
      setProximoRecontacto('');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 1. Si se marca como Finalizado, exigir resultado real (Aprobado o Denegado)
    if (faltaResultadoFinal) {
      alert("⚠️ Resultado Requerido:\nPara finalizar el trámite debes seleccionar si fue 'Aprobado' o 'Denegado / Cancelado'.");
      return;
    }

    // 2. Validación de documentos (excepto si se cancela/deniega)
    if (ETAPAS_CON_PAGO.includes(estado) && estatusDocs === 'Pendientes' && !esDenegado) {
      alert("⚠️ Validación de Documentos:\nNo puedes avanzar a pagos, citas o cierre si los documentos siguen marcados como pendientes.");
      return;
    }

    // 3. Validación de abono inicial obligatorio en etapas de pago
    if (requierePagoYEstaPendiente) {
      alert("⚠️ Validación de Pago:\nNo puedes avanzar a 'Primer Pago' ni a etapas posteriores mientras el pago siga marcado como 'Pendiente de Pago'.\n\nRegistra 'Abono Inicial' o 'Trámite Liquidado', o mantén al contacto en Asesoría / Documentos.");
      return;
    }

    // 4. Candado estricto de liquidación al finalizar un trámite aprobado
    if (requiereLiquidacion) {
      alert("⚠️ Candado de Liquidación:\nPara concluir un trámite como 'Visa / Trámite Aprobado' y enviarlo al Historial, el Estado de Pagos debe estar en '✅ Trámite Liquidado'.");
      return;
    }

    setGuardando(true);

    try {
      const fechaAgendaFinal = esFinalizado || estado === 'No_Interesado' ? null : proximoRecontacto || null;

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

      // 2. Guardar interacción en la bitácora si hay notas, fecha futura o cierre
      if (detallesInteraccion.trim() || fechaAgendaFinal || esFinalizado) {
        const notaBitacora =
          detallesInteraccion.trim() ||
          (esFinalizado
            ? `Trámite finalizado (${resultadoTramite === 'Aprobado' ? 'Aprobado y Liquidado' : 'Denegado / Cancelado'}).`
            : 'Actualización de estatus en el sistema.');

        await supabase.from('actividades').insert([
          {
            prospecto_id: prospecto.id,
            tipo_interaccion: esFinalizado ? 'Cierre de Trámite' : tipoInteraccion,
            fecha_interaccion: fechaInteraccion,
            detalles: notaBitacora,
            proximo_recontacto: fechaAgendaFinal
          }
        ]);
      }

      // 3. Si el trámite finaliza, copiar registro con las columnas reales de historial_clientes
      if (esFinalizado) {
        const etiquetaEstatus =
          resultadoTramite === 'Aprobado'
            ? 'Finalizado - Aprobado (Liquidado)'
            : 'Finalizado - Denegado';

        const { error: historialError } = await supabase.from('historial_clientes').insert([
          {
            fecha_contacto: fechaInteraccion,
            responsable: prospecto.vendedor_nombre || 'CRM ACF',
            nombre_contacto: prospecto.nombre_cliente,
            telefono: prospecto.telefono || 'S/N',
            pais: prospecto.familiar_pais || prospecto.nacionalidad || 'México',
            estado_usa: prospecto.titular_estado_eeuu || '',
            familiares_traer: prospecto.familiar_nombre || '-',
            medio: prospecto.medio_contacto || 'CRM ACF',
            estatus: etiquetaEstatus,
            notas_adicionales:
              detallesInteraccion.trim() ||
              `Trámite: ${prospecto.tipo_tramite || 'Visa de Turista'} | Resultado: ${resultadoTramite}`
          }
        ]);

        if (historialError) {
          console.error('Aviso al sincronizar con historial_clientes:', historialError.message);
        }
      }

      // 4. Notificación clara según la acción realizada
      if (esFinalizado) {
        alert("🎉 ¡Trámite finalizado con éxito!\nEl expediente se retiró del tablero activo y ya está disponible en la Base Histórica (Excel) y en el Dashboard de Indicadores.");
      } else if (estatusConfirmacion === 'Confirmado_SI') {
        alert("🎉 ¡Excelente! El cliente confirmó el SÍ y avanzó a la etapa de Asesoría / Documentos.");
      } else if (fechaAgendaFinal) {
        alert(`📅 Acercamiento registrado. El prospecto se agendó para seguimiento en la fecha: ${fechaAgendaFinal}`);
      }

      onActualizado();
      onClose();
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar: ${mensaje}`);
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
            <p className="text-blue-200 text-xs mt-0.5">{prospecto.nombre_cliente} • 📞 {prospecto.telefono || 'S/N'}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white hover:text-red-300 font-bold text-lg cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto bg-slate-50 flex-1">
          
          {/* Selector de Etapa Comercial */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase">Etapa del Trámite:</span>
            <select value={estado} onChange={e => handleCambioEstado(e.target.value)}
              className="border-2 border-[#00006a] p-2 rounded-xl text-sm font-bold text-[#00006a] bg-white outline-none">
              <option value="En Pausa / Agenda">⏸️ En Pausa / Agenda</option>
              <option value="Nuevos">1. Contactos / Informes (Primer Contacto)</option>
              <option value="Asesoria">2. Asesoría / Documentos (En Trámite Activo)</option>
              <option value="Primer_Pago">3. Primer Pago</option>
              <option value="Seguimiento">4. Seguimiento General</option>
              <option value="Cita_Cierre">5. Cita de Cierre</option>
              <option value="Finalizado">6. Finalizado (Archivar en Historial)</option>
              <option value="No_Interesado">❌ No Interesado</option>
            </select>
          </div>

          {/* CALIFICACIÓN RÁPIDA */}
          {(estado === 'Nuevos' || estado === 'En Pausa / Agenda') && (
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

          {/* Documentación */}
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

          {/* Resultado al Finalizar (colocado antes de Pagos para activar el candado visual de inmediato) */}
          {esFinalizado && (
            <div className={`p-4 rounded-xl border space-y-2 ${
              faltaResultadoFinal ? 'bg-amber-50 border-amber-300' : 'bg-slate-100 border-slate-300'
            }`}>
              <span className="text-xs font-bold text-slate-800 uppercase">🏁 Resultado del Trámite</span>
              <select value={resultadoTramite} onChange={e => setResultadoTramite(e.target.value)}
                className="w-full border border-slate-300 p-2 rounded-lg bg-white text-xs font-bold text-slate-700">
                <option value="En_Proceso">⏳ Selecciona el resultado final...</option>
                <option value="Aprobado">✅ Visa / Trámite Aprobado (Requiere Liquidación)</option>
                <option value="Denegado">❌ Denegado / Cancelado</option>
              </select>
              {faltaResultadoFinal && (
                <p className="text-[11px] text-amber-800 font-bold">
                  ⚠️ Indica si el trámite fue Aprobado o Denegado para poder archivarlo.
                </p>
              )}
            </div>
          )}

          {/* Pagos (visible en Primer Pago y etapas posteriores) */}
          {ETAPAS_CON_PAGO.includes(estado) && (
            <div className={`p-4 rounded-xl border space-y-2 ${
              requierePagoYEstaPendiente || requiereLiquidacion
                ? 'bg-red-50 border-red-300'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <span className={`text-xs font-bold uppercase ${
                requierePagoYEstaPendiente || requiereLiquidacion ? 'text-red-800' : 'text-emerald-900'
              }`}>
                💰 Estado de Pagos
              </span>
              <select value={estatusPago} onChange={e => setEstatusPago(e.target.value)}
                className={`w-full border p-2 rounded-lg bg-white text-xs font-medium text-slate-700 ${
                  requierePagoYEstaPendiente || requiereLiquidacion ? 'border-red-400' : 'border-emerald-300'
                }`}>
                <option value="Pendiente">❌ Pendiente de Pago</option>
                <option value="Abono_Inicial">💵 Abono Inicial Realizado</option>
                <option value="Liquidado">✅ Trámite Liquidado</option>
              </select>

              {requierePagoYEstaPendiente && (
                <p className="text-[11px] text-red-700 font-bold">
                  ⚠️ Debes registrar al menos el "Abono Inicial Realizado" para poder guardar en esta etapa.
                </p>
              )}

              {requiereLiquidacion && (
                <p className="text-[11px] text-red-700 font-bold">
                  🔒 Candado de Liquidación: Para cerrar un trámite Aprobado y pasarlo al Historial, el pago debe estar en "✅ Trámite Liquidado".
                </p>
              )}
            </div>
          )}

          {/* Cita de Cierre */}
          {estado === 'Cita_Cierre' && (
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-2">
              <span className="text-xs font-bold text-purple-900 uppercase">🗓️ Estado de Cita</span>
              <select value={estatusCita} onChange={e => setEstatusCita(e.target.value)}
                className="w-full border border-purple-300 p-2 rounded-lg bg-white text-xs font-medium text-slate-700">
                <option value="Sin_Agendar">⏳ Pendiente de Agendar</option>
                <option value="Agendada">📅 Cita Agendada</option>
                <option value="Asistio">✅ Asistió a Cita</option>
              </select>
            </div>
          )}

          {/* REGISTRO DE BITÁCORA Y FECHA FUTURA */}
          <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 space-y-3">
            <span className="text-xs font-bold text-indigo-900 uppercase">
              {esFinalizado ? '📝 Notas de Cierre del Trámite' : '📝 Bitácora de Llamada y Agendado'}
            </span>
            
            {!esFinalizado && estado !== 'No_Interesado' ? (
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
            ) : (
              <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                ✅ Al finalizar este trámite, saldrá automáticamente del tablero Kanban, no se agendarán seguimientos futuros y quedará archivado en el Historial Excel y el Dashboard.
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700">
                {esFinalizado ? 'Observaciones finales (Opcional)' : 'Notas de lo conversado'}
              </label>
              <textarea rows={2} value={detallesInteraccion} onChange={e => setDetallesInteraccion(e.target.value)}
                placeholder={
                  esFinalizado
                    ? 'Ej. Visa aprobada por 10 años, pago liquidado y documentos entregados...'
                    : 'Ej. Dice que iniciará trámite el próximo año (Enero 2027) / Pidió 2 semanas para juntar el dinero...'
                }
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-bold rounded-xl hover:bg-slate-200 text-xs cursor-pointer">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-5 py-2 bg-[#fa0101] text-white rounded-xl font-bold hover:bg-[#d00000] shadow-md text-xs cursor-pointer disabled:opacity-60">
              {guardando ? '⏳ Guardando...' : esFinalizado ? '🏁 Finalizar y Archivar' : '💾 Guardar Registro'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}