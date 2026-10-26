import React, { useState } from 'react';
import { supabase } from './supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGuardado: () => void;
}

export default function NuevoProspectoModal({ isOpen, onClose, onGuardado }: Props) {
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  
  const [telefono, setTelefono] = useState('');
  const [nacionalidad, setNacionalidad] = useState('Mexicana');
  const [tipoTramite, setTipoTramite] = useState('Pasaporte');
  const [tipoPaquete, setTipoPaquete] = useState('Basico_Menores55');
  const [modalidadCita, setModalidadCita] = useState('Presencial');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  // NUEVAS VARIABLES PARA LOS CAMPOS CONDICIONALES
  const [destinoUsa, setDestinoUsa] = useState('');
  const [ubicacionFamiliar, setUbicacionFamiliar] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const nombreCompleto = `${nombre.trim()} ${apellidoPaterno.trim()} ${apellidoMaterno.trim()}`.trim();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa");

      // Validamos si se cumplen las dos condiciones para guardar los campos nuevos
      const esVisaAdultos = tipoTramite === 'Visa de Turista' && tipoPaquete === 'Completo_Mayores55';

      const { error } = await supabase
        .from('prospectos')
        .insert([
          {
            vendedor_id: session.user.id,
            nombre_cliente: nombreCompleto,
            telefono: telefono,
            nacionalidad: nacionalidad,
            tipo_tramite: tipoTramite,
            tipo_paquete: tipoPaquete,
            modalidad_cita: modalidadCita,
            notas: notas,
            estado: 'Nuevos',
            estatus_documentos: 'Pendientes',
            // Si es Visa de Turista + Completo Mayores de 55, guarda la info. Si no, manda null.
            destino_usa: esVisaAdultos ? destinoUsa : null,
            ubicacion_familiar_usa: esVisaAdultos ? ubicacionFamiliar : null
          }
        ]);

      if (error) throw error;
      
      setNombre(''); setApellidoPaterno(''); setApellidoMaterno('');
      setTelefono(''); setNotas('');
      setDestinoUsa(''); setUbicacionFamiliar('');
      setTipoTramite('Pasaporte');
      setTipoPaquete('Basico_Menores55');
      
      onGuardado();
    } catch (error: any) {
      console.error("Error al guardar:", error);
      alert(`Error de Supabase:\nMensaje: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soloNumeros = e.target.value.replace(/[^0-9]/g, '');
    setTelefono(soloNumeros);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 transition-all">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
        
        <div className="bg-[#00006a] p-5 text-white">
          <h2 className="text-xl font-black tracking-wide flex items-center gap-2">
            👤 Registrar Nuevo Prospecto
          </h2>
          <p className="text-blue-200 text-sm mt-1">Ingresa los datos del cliente para comenzar el seguimiento.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-slate-50">
          
          <div className="flex gap-2">
            <div className="w-1/3">
              <label className="block text-xs font-bold text-slate-700">Nombre(s) *</label>
              <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} 
                className="w-full border border-slate-300 p-2 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm" placeholder="Ej. Juan" />
            </div>
            <div className="w-1/3">
              <label className="block text-xs font-bold text-slate-700">Ap. Paterno *</label>
              <input required type="text" value={apellidoPaterno} onChange={e => setApellidoPaterno(e.target.value)} 
                className="w-full border border-slate-300 p-2 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm" placeholder="Pérez" />
            </div>
            <div className="w-1/3">
              <label className="block text-xs font-bold text-slate-700">Ap. Materno</label>
              <input type="text" value={apellidoMaterno} onChange={e => setApellidoMaterno(e.target.value)} 
                className="w-full border border-slate-300 p-2 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm" placeholder="López" />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-1/2">
              <label className="block text-sm font-bold text-slate-700">Teléfono (10 dígitos) *</label>
              <input required type="tel" maxLength={10} value={telefono} onChange={handleTelefonoChange} 
                className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm" placeholder="Ej. 5512345678" />
            </div>
            
            <div className="w-1/2">
              <label className="block text-sm font-bold text-slate-700">Nacionalidad</label>
              <select value={nacionalidad} onChange={e => setNacionalidad(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm font-medium">
                <option value="Mexicana">Mexicana 🇲🇽</option>
                <option value="Estadounidense">Estadounidense 🇺🇸</option>
                <option value="Guatemalteca">Guatemalteca 🇬🇹</option>
                <option value="Salvadoreña">Salvadoreña 🇸🇻</option>
                <option value="Hondureña">Hondureña 🇭🇳</option>
                <option value="Colombiana">Colombiana 🇨🇴</option>
                <option value="Venezolana">Venezolana 🇻🇪</option>
                <option value="Otra">Otra 🌍</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-1/2">
              <label className="block text-sm font-bold text-slate-700">Trámite</label>
              <select value={tipoTramite} onChange={e => setTipoTramite(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm font-medium">
                <option value="Pasaporte">Pasaporte</option>
                {/* CAMBIO: Ahora dice Visa de Turista */}
                <option value="Visa de Turista">Visa de Turista</option>
                <option value="Ambas">Ambas</option>
              </select>
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-bold text-slate-700">Modalidad</label>
              <select value={modalidadCita} onChange={e => setModalidadCita(e.target.value)} 
                className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm font-medium">
                <option value="Presencial">Presencial</option>
                <option value="En_Linea">En Línea</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700">Tipo de Paquete</label>
            <select value={tipoPaquete} onChange={e => setTipoPaquete(e.target.value)} 
              className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm font-medium">
              <option value="Basico_Menores55">Básico (Menores de 55)</option>
              <option value="Completo_Mayores55">Completo (Mayores de 55)</option>
            </select>
          </div>

          {/* LÓGICA CONDICIONAL CON TUS CLASES DE TAILWIND */}
          {tipoTramite === 'Visa de Turista' && tipoPaquete === 'Completo_Mayores55' && (
            <div className="flex gap-3 bg-slate-200 p-4 rounded-xl border border-slate-300 animate-fade-in">
              <div className="w-1/2">
                <label className="block text-sm font-bold text-slate-700">Lugar al que irían en USA *</label>
                <input required type="text" value={destinoUsa} onChange={e => setDestinoUsa(e.target.value)}
                  className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm" placeholder="Ej. Los Ángeles, CA" />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-bold text-slate-700">Ubicación del familiar/amigo *</label>
                <input required type="text" value={ubicacionFamiliar} onChange={e => setUbicacionFamiliar(e.target.value)}
                  className="w-full border border-slate-300 p-2.5 rounded-xl mt-1 focus:ring-2 focus:ring-[#00006a] outline-none shadow-sm" placeholder="Ej. Misma ciudad" />
              </div>
            </div>
          )}

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