import React, { useState } from 'react';
import { supabase } from './supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGuardado: () => void;
}

export default function NuevoProspectoModal({ isOpen, onClose, onGuardado }: Props) {
  const [tipoModelo, setTipoModelo] = useState<'familiar_usa' | 'directo'>('familiar_usa');

  // Campos compartidos (Trámite y Paquete)
  const [tipoTramite, setTipoTramite] = useState('Visa de Turista');
  const [tipoPaquete, setTipoPaquete] = useState('Completo_Mayores55');

  // Campos para Opción 1: Familiar en USA
  const [nombreUsa, setNombreUsa] = useState('');
  const [apellidosUsa, setApellidosUsa] = useState('');
  const [familiarTraer, setFamiliarTraer] = useState('');
  const [paisOrigen, setPaisOrigen] = useState('México');
  const [estadoUsa, setEstadoUsa] = useState('');
  const [telefonoUsa, setTelefonoUsa] = useState('');
  const [medio, setMedio] = useState('Volante / Tarjeta');
  const [estatusInicial, setEstatusInicial] = useState('Nuevos');
  const [fechaContacto, setFechaContacto] = useState(new Date().toISOString().split('T')[0]);

  // Campos para Opción 2: Prospecto Directo
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [telefonoDirecto, setTelefonoDirecto] = useState('');

  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      let datosAInsertar: any = {};

      if (tipoModelo === 'familiar_usa') {
        const nombreCompletoUsa = `${nombreUsa.trim()} ${apellidosUsa.trim()}`.trim();
        
        const notasFormateadas = `[Familiar en USA] 
• Contacto: ${nombreCompletoUsa}
• Familiar a Traer: ${familiarTraer.trim()}
• País Origen: ${paisOrigen}
• Estado en USA: ${estadoUsa.trim()}
• Medio: ${medio}
• Agenda: ${fechaContacto}
• Notas: ${notas.trim() || 'Ninguna'}`;

        datosAInsertar = {
          vendedor_id: session.user.id,
          nombre_cliente: `🇺🇸 ${nombreCompletoUsa} (Trae a: ${familiarTraer.trim()})`,
          telefono: telefonoUsa,
          nacionalidad: paisOrigen,
          tipo_tramite: tipoTramite,
          tipo_paquete: tipoPaquete,
          estado: estatusInicial,
          estatus_documentos: 'Pendientes',
          notas: notasFormateadas
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
          estado: estatusInicial,
          estatus_documentos: 'Pendientes',
          notas: notas.trim() || 'Prospecto directo individual'
        };
      }

      const { error } = await supabase
        .from('prospectos')
        .insert([datosAInsertar]);

      if (error) throw error;
      
      // Limpiar formulario
      setNombreUsa(''); setApellidosUsa(''); setFamiliarTraer(''); setEstadoUsa(''); setTelefonoUsa('');
      setNombre(''); setApellidoPaterno(''); setApellidoMaterno(''); setTelefonoDirecto('');
      setNotas('');
      
      onGuardado();
      onClose();
    } catch (error: any) {
      console.error("Error al guardar:", error);
      alert(`Error de Supabase:\nMensaje: ${error.message}`);
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
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200">
        
        <div className="bg-[#00006a] p-5 text-white">
          <h2 className="text-xl font-black tracking-wide flex items-center gap-2">
            👤 Registrar Nuevo Prospecto
          </h2>
          <p className="text-blue-200 text-sm mt-1">Selecciona el tipo de modelo de atención comercial.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-slate-50 max-h-[85vh] overflow-y-auto">
          
          <div className="flex bg-slate-200 p-1.5 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setTipoModelo('familiar_usa')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                tipoModelo === 'familiar_usa' 
                  ? 'bg-emerald-800 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇺🇸 Familiar en USA (Trayendo a Familiar)
            </button>
            <button
              type="button"
              onClick={() => setTipoModelo('directo')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                tipoModelo === 'directo' 
                  ? 'bg-emerald-800 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👤 Prospecto Directo (Individual)
            </button>
          </div>

          {/* Selectores de Trámite y Paquete compartidos */}
          <div className="grid grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700">Tipo de Trámite *</label>
              <select value={tipoTramite} onChange={e => setTipoTramite(e.target.value)} 
                className="w-full border border-slate-300 p-2 rounded-lg mt-1 focus:ring-2 focus:ring-[#00006a] outline-none text-sm font-medium bg-white">
                <option value="Visa de Turista">Visa de Turista</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="Ambas">Ambas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Tipo de Paquete *</label>
              <select value={tipoPaquete} onChange={e => setTipoPaquete(e.target.value)} 
                className="w-full border border-slate-300 p-2 rounded-lg mt-1 focus:ring-2 focus:ring-[#00006a] outline-none text-sm font-medium bg-white">
                <option value="Completo_Mayores55">Completo (Mayores de 55)</option>
                <option value="Basico_Menores55">Básico (Menores de 55)</option>
              </select>
            </div>
          </div>

          {tipoModelo === 'familiar_usa' ? (
            <div className="flex flex-col gap-3.5 animate-fade-in bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <span className="text-xs font-bold text-emerald-900 uppercase">📋 Datos del Contacto en el Extranjero</span>
              
              <div className="flex gap-3">
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700">Nombre(s) Contacto USA *</label>
                  <input required type="text" value={nombreUsa} onChange={e => setNombreUsa(e.target.value)} 
                    className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" placeholder="Ej. Melvin" />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700">Apellidos Contacto USA *</label>
                  <input required type="text" value={apellidosUsa} onChange={e => setApellidosUsa(e.target.value)} 
                    className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" placeholder="Ej. Pérez Gómez" />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700">Familiar que quiere traer *</label>
                  <input required type="text" value={familiarTraer} onChange={e => setFamiliarTraer(e.target.value)} 
                    className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" placeholder="Ej. Mamá, Hijos" />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700">País de Origen del Familiar *</label>
                  <select value={paisOrigen} onChange={e => setPaisOrigen(e.target.value)}
                    className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm font-medium">
                    <option value="México">México 🇲🇽</option>
                    <option value="Guatemala">Guatemala 🇬🇹</option>
                    <option value="El Salvador">El Salvador 🇸🇻</option>
                    <option value="Honduras">Honduras 🇭🇳</option>
                    <option value="Colombia">Colombia 🇨🇴</option>
                    <option value="Otro">Otro 🌍</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700">Estado en USA *</label>
                  <input required type="text" value={estadoUsa} onChange={e => setEstadoUsa(e.target.value)} 
                    className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" placeholder="Ej. Ohio, California" />
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700">Teléfono de Contacto *</label>
                  <input required type="tel" value={telefonoUsa} onChange={e => handleTelefonoChange(e, setTelefonoUsa)} 
                    className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" placeholder="Ej. +1 513 205..." />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700">Medio por el que se enteró</label>
                  <select value={medio} onChange={e => setMedio(e.target.value)} 
                    className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm font-medium">
                    <option value="Volante / Tarjeta">Volante / Tarjeta</option>
                    <option value="Redes Sociales">Redes Sociales</option>
                    <option value="Recomendación">Recomendación</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-slate-700">Estatus Inicial en Kanban</label>
                  <select value={estatusInicial} onChange={e => setEstatusInicial(e.target.value)} 
                    className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm font-medium">
                    <option value="Nuevos">Nuevos</option>
                    <option value="En Seguimiento">En Seguimiento</option>
                    <option value="Contactado">Contactado</option>
                    <option value="No responde">No responde</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Fecha de Agenda / Contacto</label>
                <input type="date" value={fechaContacto} onChange={e => setFechaContacto(e.target.value)} 
                  className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 animate-fade-in bg-slate-100 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase">📋 Datos del Solicitante Directo</span>
              
              <div className="flex gap-2">
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-slate-700">Nombre(s) *</label>
                  <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" placeholder="Ej. Juan" />
                </div>
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-slate-700">Ap. Paterno *</label>
                  <input required type="text" value={apellidoPaterno} onChange={e => setApellidoPaterno(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" placeholder="Pérez" />
                </div>
                <div className="w-1/3">
                  <label className="block text-xs font-bold text-slate-700">Ap. Materno</label>
                  <input type="text" value={apellidoMaterno} onChange={e => setApellidoMaterno(e.target.value)} 
                    className="w-full border border-slate-300 p-2 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" placeholder="López" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Teléfono (10 dígitos) *</label>
                <input required type="tel" maxLength={10} value={telefonoDirecto} onChange={e => handleTelefonoChange(e, setTelefonoDirecto)} 
                  className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm bg-white text-sm" placeholder="Ej. 5512345678" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700">Notas Adicionales / Agenda</label>
            <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)}
              className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm text-sm bg-white" placeholder="Comentarios de la llamada o acuerdos..." />
          </div>

          <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} 
              className="px-5 py-2.5 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={guardando} 
              className="px-5 py-2.5 bg-[#fa0101] text-white rounded-xl font-bold hover:bg-[#d00000] shadow-md transition-colors disabled:bg-red-300">
              {guardando ? '⏳ Guardando...' : '💾 Guardar Prospecto'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}