import React, { useState } from 'react';
import { supabase } from './supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGuardado: () => void;
}

const estadosMexico = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", 
  "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", 
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", 
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", 
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

const departamentosGuatemala = [
  "Alta Verapaz", "Baja Verapaz", "Chimaltenango", "Chiquimula", "El Progreso", 
  "Escuintla", "Guatemala", "Huehuetenango", "Izabal", "Jalapa", "Jutiapa", 
  "Petén", "Quetzaltenango", "Quiché", "Retalhuleu", "Sacatepéquez", "San Marcos", 
  "Santa Rosa", "Sololá", "Suchitepéquez", "Totonicapán", "Zacapa"
];

export default function NuevoProspectoModal({ isOpen, onClose, onGuardado }: Props) {
  const [tipoModelo, setTipoModelo] = useState<'familiar_usa' | 'directo'>('familiar_usa');

  // Campos compartidos
  const [tipoTramite, setTipoTramite] = useState('Visa de Turista');
  const [tipoPaquete, setTipoPaquete] = useState('Completo_Mayores55');

  // Titular en USA
  const [nombreUsa, setNombreUsa] = useState('');
  const [apellidosUsa, setApellidosUsa] = useState('');
  const [telefonoUsa, setTelefonoUsa] = useState('');
  const [estadoUsa, setEstadoUsa] = useState('');
  const [medio, setMedio] = useState('Volante / Tarjeta');

  // Familiar a traer
  const [nombreFamiliar, setNombreFamiliar] = useState('');
  const [apellidosFamiliar, setApellidosFamiliar] = useState('');
  const [parentescoFamiliar, setParentescoFamiliar] = useState('Mamá');
  const [paisOrigen, setPaisOrigen] = useState('México');
  const [ubicacionDetalle, setUbicacionDetalle] = useState(estadosMexico[0]);
  const [paisPersonalizado, setPaisPersonalizado] = useState('');

  // Prospecto Directo
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [telefonoDirecto, setTelefonoDirecto] = useState('');

  // 🎯 Calificación Inicial
  const [estatusDecision, setEstatusDecision] = useState<'Analizando' | 'Confirmado_SI' | 'No_Interesado'>('Analizando');
  const [fechaRecontacto, setFechaRecontacto] = useState('');
  const [notas, setNotas] = useState('');

  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const handlePaisChange = (nuevoPais: string) => {
    setPaisOrigen(nuevoPais);
    if (nuevoPais === 'México') setUbicacionDetalle(estadosMexico[0]);
    else if (nuevoPais === 'Guatemala') setUbicacionDetalle(departamentosGuatemala[0]);
    else setUbicacionDetalle('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      // 🎯 LÓGICA CORREGIDA: 
      // Si confirma que SÍ quiere iniciar, va al Kanban ("Contactos / Informes").
      // Si está "Analizando" (lo va a pensar), le asignamos un estado de pausa o de agenda para que NO sature el Kanban principal.
      const estadoEtapa = estatusDecision === 'Confirmado_SI' ? 'Contactos / Informes' : 'En Pausa / Agenda';
      const paisFinal = paisOrigen === 'Otro' ? paisPersonalizado.trim() || 'Otro' : paisOrigen;

      let datosAInsertar: any = {};

      if (tipoModelo === 'familiar_usa') {
        const nombreCompletoUsa = `${nombreUsa.trim()} ${apellidosUsa.trim()}`.trim();
        const nombreCompletoFam = `${nombreFamiliar.trim()} ${apellidosFamiliar.trim()}`.trim();

        datosAInsertar = {
          vendedor_id: session.user.id,
          nombre_cliente: `🇺🇸 ${nombreCompletoUsa} (Trae a ${parentescoFamiliar}: ${nombreCompletoFam})`,
          telefono: telefonoUsa,
          nacionalidad: `${paisFinal} (${ubicacionDetalle || 'N/A'})`,
          tipo_tramite: tipoTramite,
          tipo_paquete: tipoPaquete,
          estado: estadoEtapa,
          estatus_documentos: 'Pendientes',
          titular_estado_eeuu: estadoUsa,
          medio_contacto: medio,
          familiar_nombre: nombreCompletoFam,
          familiar_pais: paisFinal,
          familiar_estado: ubicacionDetalle || 'N/A'
        };
      } else {
        const nombreCompletoDirecto = `${nombre.trim()} ${apellidoPaterno.trim()} ${apellidoMaterno.trim()}`.trim();

        datosAInsertar = {
          vendedor_id: session.user.id,
          nombre_cliente: nombreCompletoDirecto,
          telefono: telefonoDirecto,
          nacionalidad: 'Mexicana',
          tipo_tramite: tipoTramite,
          tipo_paquete: tipoPaquete,
          estado: estadoEtapa,
          estatus_documentos: 'Pendientes',
          medio_contacto: medio
        };
      }

      const { data: prospectoCreado, error } = await supabase
        .from('prospectos')
        .insert([datosAInsertar])
        .select()
        .single();

      if (error) throw error;

      // Registrar actividad para la Agenda de Recordatorios
      if (prospectoCreado) {
        await supabase.from('actividades').insert([
          {
            prospecto_id: prospectoCreado.id,
            tipo_interaccion: estatusDecision === 'Confirmado_SI' ? 'Inicio de Trámite' : 'Lo va a pensar',
            fecha_interaccion: new Date().toISOString().split('T')[0],
            detalles: notas.trim() || (estatusDecision === 'Confirmado_SI' ? 'Confirmó de inmediato.' : 'Quedó pendiente de analizar con su familia.'),
            proximo_recontacto: fechaRecontacto || null
          }
        ]);
      }

      if (estatusDecision === 'Confirmado_SI') {
        alert("🎉 ¡Prospecto registrado con éxito en el Flujo Comercial (Kanban)!");
      } else {
        alert("📅 Prospecto guardado. Como quedó analizando, se ha enviado directamente a la Agenda de Recordatorios.");
      }

      // Limpiar formulario
      setNombreUsa(''); setApellidosUsa(''); setTelefonoUsa(''); setEstadoUsa('');
      setNombreFamiliar(''); setApellidosFamiliar(''); setNombre(''); setApellidoPaterno('');
      setApellidoMaterno(''); setTelefonoDirecto(''); setNotas(''); setFechaRecontacto(''); setPaisPersonalizado('');

      onGuardado();
      onClose();
    } catch (error: any) {
      console.error("Error al guardar:", error);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const soloNumeros = e.target.value.replace(/[^0-9+]/g, '');
    setter(soloNumeros);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 transition-all">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        <div className="bg-[#00006a] p-5 text-white">
          <h2 className="text-xl font-black tracking-wide flex items-center gap-2">
            👤 Registrar Nuevo Prospecto
          </h2>
          <p className="text-blue-200 text-xs mt-1">Estructura comercial: Titular (EE. UU.) y Familiar Beneficiario.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-slate-50 overflow-y-auto flex-1">
          
          <div className="flex bg-slate-200 p-1.5 rounded-xl gap-1">
            <button type="button" onClick={() => setTipoModelo('familiar_usa')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tipoModelo === 'familiar_usa' ? 'bg-[#00006a] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              🇺🇸 Familiar en USA (Trayendo a Familiar)
            </button>
            <button type="button" onClick={() => setTipoModelo('directo')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tipoModelo === 'directo' ? 'bg-[#00006a] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              👤 Solicitante Directo (Individual)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700">Tipo de Trámite *</label>
              <select value={tipoTramite} onChange={e => setTipoTramite(e.target.value)} 
                className="w-full border border-slate-300 p-2 rounded-lg mt-1 text-xs font-medium bg-white outline-none">
                <option value="Visa de Turista">Visa de Turista (B1/B2)</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="Ambas">Ambas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Tipo de Paquete *</label>
              <select value={tipoPaquete} onChange={e => setTipoPaquete(e.target.value)} 
                className="w-full border border-slate-300 p-2 rounded-lg mt-1 text-xs font-medium bg-white outline-none">
                <option value="Completo_Mayores55">Completo (Mayores de 55)</option>
                <option value="Basico_Menores55">Básico (Menores de 55)</option>
              </select>
            </div>
          </div>

          {tipoModelo === 'familiar_usa' ? (
            <div className="flex flex-col gap-3.5 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs font-bold text-emerald-900 uppercase">🇺🇸 1. Datos del Titular (En EE. UU.)</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Nombre(s) del Titular *</label>
                  <input required type="text" value={nombreUsa} onChange={e => setNombreUsa(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="Ej. Alexander" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Apellidos del Titular *</label>
                  <input required type="text" value={apellidosUsa} onChange={e => setApellidosUsa(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="Ej. Ramírez Ruiz" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Teléfono / WhatsApp *</label>
                  <input required type="tel" value={telefonoUsa} onChange={e => handleTelefonoChange(e, setTelefonoUsa)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="+1 569 034..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Estado en EE. UU. *</label>
                  <input required type="text" value={estadoUsa} onChange={e => setEstadoUsa(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="Ej. California, Texas" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Medio por el que se enteró el Titular</label>
                <select value={medio} onChange={e => setMedio(e.target.value)} 
                  className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs font-medium">
                  <option value="Facebook">Facebook</option>
                  <option value="WhatsApp">WhatsApp Directo</option>
                  <option value="Recomendación">Recomendación de cliente</option>
                  <option value="TikTok / Instagram">TikTok / Instagram</option>
                  <option value="Volante / Tarjeta">Volante / Tarjeta</option>
                </select>
              </div>

              <div className="border-t border-emerald-200 pt-3 mt-1">
                <span className="text-xs font-bold text-emerald-900 uppercase">🌍 2. Datos del Familiar Beneficiario</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Parentesco *</label>
                  <select value={parentescoFamiliar} onChange={e => setParentescoFamiliar(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs font-medium">
                    <option value="Mamá">Mamá</option>
                    <option value="Papá">Papá</option>
                    <option value="Esposo/a">Esposo/a</option>
                    <option value="Hijo/a">Hijo/a</option>
                    <option value="Hermano/a">Hermano/a</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Nombre(s) Familiar *</label>
                  <input required type="text" value={nombreFamiliar} onChange={e => setNombreFamiliar(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="Ej. Isabel" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Apellidos Familiar *</label>
                  <input required type="text" value={apellidosFamiliar} onChange={e => setApellidosFamiliar(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="Ej. Ruiz" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">País de Residencia *</label>
                  <select value={paisOrigen} onChange={e => handlePaisChange(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs font-medium">
                    <option value="México">México 🇲🇽</option>
                    <option value="Guatemala">Guatemala 🇬🇹</option>
                    <option value="El Salvador">El Salvador 🇸🇻</option>
                    <option value="Honduras">Honduras 🇭🇳</option>
                    <option value="Otro">Otro 🌍</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    {paisOrigen === 'México' ? 'Estado *' : paisOrigen === 'Guatemala' ? 'Departamento *' : 'Región / Estado *'}
                  </label>
                  {paisOrigen === 'México' ? (
                    <select value={ubicacionDetalle} onChange={e => setUbicacionDetalle(e.target.value)}
                      className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs font-medium">
                      {estadosMexico.map(est => <option key={est} value={est}>{est}</option>)}
                    </select>
                  ) : paisOrigen === 'Guatemala' ? (
                    <select value={ubicacionDetalle} onChange={e => setUbicacionDetalle(e.target.value)}
                      className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs font-medium">
                      {departamentosGuatemala.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                    </select>
                  ) : paisOrigen === 'Otro' ? (
                    <input required type="text" value={paisPersonalizado} onChange={e => setPaisPersonalizado(e.target.value)}
                      className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="Especifique país y región" />
                  ) : (
                    <input required type="text" value={ubicacionDetalle} onChange={e => setUbicacionDetalle(e.target.value)}
                      className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="Ciudad o Departamento" />
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col gap-3.5 bg-slate-100 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase">📋 Datos del Solicitante Directo</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Nombre(s) *</label>
                  <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="Juan" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Ap. Paterno *</label>
                  <input required type="text" value={apellidoPaterno} onChange={e => setApellidoPaterno(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="Pérez" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Ap. Materno</label>
                  <input type="text" value={apellidoMaterno} onChange={e => setApellidoMaterno(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="López" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Teléfono *</label>
                <input required type="tel" value={telefonoDirecto} onChange={e => handleTelefonoChange(e, setTelefonoDirecto)} 
                  className="w-full border border-slate-300 p-2 rounded-xl mt-1 bg-white text-xs" placeholder="5512345678" />
              </div>
            </div>
          )}

          {/* 🎯 SECCIÓN CLAVE: Decisión inicial al registrar */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 space-y-2">
            <span className="text-xs font-bold text-indigo-900 uppercase">🎯 Calificación del Primer Contacto</span>
            <select value={estatusDecision} onChange={e => setEstatusDecision(e.target.value as any)}
              className="w-full border border-indigo-300 p-2 rounded-lg bg-white text-xs font-bold text-slate-800">
              <option value="Analizando">⏳ Lo va a pensar / Consultará con su familia (Enviar a Agenda)</option>
              <option value="Confirmado_SI">⚡ ¡SÍ QUIERE INICIAR DE INMEDIATO! (Mover a Kanban)</option>
              <option value="No_Interesado">❌ No interesado</option>
            </select>

            {estatusDecision === 'Analizando' && (
              <div className="mt-2">
                <label className="block text-xs font-bold text-slate-700">📅 Fecha de Recontacto para la Agenda (Opcional)</label>
                <input type="date" value={fechaRecontacto} onChange={e => setFechaRecontacto(e.target.value)}
                  className="w-full border border-slate-300 p-2 rounded-lg mt-1 text-xs bg-white font-semibold text-indigo-900" />
                <p className="text-[10px] text-slate-500 mt-0.5 italic">Si no pones fecha, el sistema te avisará automáticamente a las 2 semanas.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Notas / Comentarios Iniciales</label>
            <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)}
              className="w-full border border-slate-300 p-2 rounded-xl mt-1 text-xs bg-white" placeholder="Detalles de lo conversado..." />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-bold rounded-xl hover:bg-slate-200 text-xs">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-5 py-2 bg-[#fa0101] text-white rounded-xl font-bold hover:bg-[#d00000] shadow-md text-xs">
              {guardando ? '⏳ Guardando...' : '💾 Guardar Prospecto'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}