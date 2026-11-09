import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface Props {
  onAbrirProspecto: (prospecto: any) => void;
}

export default function AgendaRecordatorios({ onAbrirProspecto }: Props) {
  const [recordatorios, setRecordatorios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'hoy' | 'proximos'>('todos');

  useEffect(() => {
    obtenerAgenda();
  }, []);

  const obtenerAgenda = async () => {
    setCargando(true);

    const { data: prospectos, error } = await supabase
      .from('prospectos')
      .select('*, actividades(*)');

    if (!error && prospectos) {
      const hoyObj = new Date();
      const hoyStr = hoyObj.toISOString().split('T')[0];
      
      // Fecha de mañana para alertas anticipadas
      const mañanaObj = new Date();
      mañanaObj.setDate(mañanaObj.getDate() + 1);
      const mañanaStr = mañanaObj.toISOString().split('T')[0];

      const listaAgenda: any[] = [];

      prospectos.forEach((p) => {
        // Encontrar la última actividad registrada en la bitácora
        const ultimaActividad = p.actividades && p.actividades.length > 0 
          ? p.actividades.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : null;

        let fechaAgenda = ultimaActividad?.proximo_recontacto || p.fecha_agenda;
        let esSugerido = false;

        // Si no hay fecha programada, aplicamos regla de 2 a 3 semanas (14-21 días) por inactividad
        if (!fechaAgenda && p.estado !== 'Finalizado') {
          const fechaBase = new Date(ultimaActividad?.fecha_interaccion || p.created_at || hoyStr);
          fechaBase.setDate(fechaBase.getDate() + 14); // 2 semanas por defecto
          fechaAgenda = fechaBase.toISOString().split('T')[0];
          esSugerido = true;
        }

        if (fechaAgenda && p.estado !== 'Finalizado') {
          // Es urgente/vencido si la fecha es hoy, ya pasó, o es mañana (alerta anticipada de 1 día)
          const esUrgente = fechaAgenda <= mañanaStr;
          
          listaAgenda.push({
            prospecto: p,
            fechaAgenda,
            ultimaActividad,
            esUrgente,
            esSugerido
          });
        }
      });

      // Ordenar por fecha más próxima
      listaAgenda.sort((a, b) => new Date(a.fechaAgenda).getTime() - new Date(b.fechaAgenda).getTime());
      setRecordatorios(listaAgenda);
    }

    setCargando(false);
  };

  const hoyStr = new Date().toISOString().split('T')[0];

  const recordatoriosFiltrados = recordatorios.filter((item) => {
    if (filtro === 'hoy') return item.esUrgente; // Incluye hoy, vencidos y aviso de mañana
    if (filtro === 'proximos') return !item.esUrgente;
    return true;
  });

  return (
    <div className="p-8 w-full flex flex-col flex-1 bg-slate-50">
      
      {/* Encabezado y Filtros alineados correctamente a la izquierda */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-[#00006a]">📅 Agenda de Recordatorios y Seguimientos</h1>
          <p className="text-slate-600 text-sm mt-1">Control inteligente: Avisos de llamadas próximas (1 día antes) y seguimientos por inactividad de 2-3 semanas.</p>
        </div>
        
        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs">
          <button 
            onClick={() => setFiltro('todos')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filtro === 'todos' ? 'bg-[#00006a] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Todos ({recordatorios.length})
          </button>
          <button 
            onClick={() => setFiltro('hoy')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filtro === 'hoy' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            🔴 Urgentes / Hoy / Mañana ({recordatorios.filter(r => r.esUrgente).length})
          </button>
          <button 
            onClick={() => setFiltro('proximos')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filtro === 'proximos' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            📅 Próximos / Futuro ({recordatorios.filter(r => !r.esUrgente).length})
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-16 text-slate-500 font-bold">⏳ Sincronizando agenda inteligente...</div>
      ) : recordatoriosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs text-slate-500 font-medium max-w-lg mt-6">
          🎉 ¡Excelente trabajo! No hay recordatorios pendientes en esta sección. Todo está al corriente.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordatoriosFiltrados.map((item, idx) => {
            const p = item.prospecto;
            return (
              <div 
                key={idx}
                onClick={() => onAbrirProspecto(p)}
                className={`bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between ${
                  item.esUrgente ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                }`}>
                
                <div>
                  <div className="flex justify-between items-center gap-2 mb-3">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                      item.esUrgente 
                        ? 'bg-red-100 text-red-700 border border-red-200' 
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {item.esUrgente ? '🚨 ¡Atención Hoy / Mañana!' : '📅 Programado'}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {p.estado}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-[#00006a] text-lg">{p.nombre_cliente}</h3>
                  <p className="text-xs text-slate-500 mt-1">📞 {p.telefono} | Trámite: {p.tipo_tramite}</p>

                  <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <p className="font-bold text-slate-700 flex items-center justify-between">
                      <span>Fecha Programada:</span>
                      <span className={item.esUrgente ? 'text-red-600 font-black text-sm' : 'text-blue-700 font-bold'}>{item.fechaAgenda}</span>
                    </p>
                    {item.esSugerido && (
                      <span className="text-[10px] text-amber-600 block italic font-semibold">⚠️ Sugerido por inactividad (han pasado 2 semanas sin contacto).</span>
                    )}
                    {item.ultimaActividad ? (
                      <p className="text-slate-600 mt-2 italic line-clamp-2 bg-white p-2 rounded border border-slate-100">
                        💬 "{item.ultimaActividad.detalles}"
                      </p>
                    ) : (
                      <p className="text-slate-400 mt-1 italic">Sin notas registradas.</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                  <span className="text-xs font-bold text-[#fa0101] hover:underline flex items-center gap-1">
                    Abrir Bitácora y Gestionar ➔
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}