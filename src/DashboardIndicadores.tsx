import { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface Actividad {
  id?: string;
  created_at?: string;
  fecha_interaccion?: string | null;
  proximo_recontacto?: string | null;
  tipo_interaccion?: string | null;
  detalles?: string | null;
}

interface Prospecto {
  id: string;
  created_at?: string;
  nombre_cliente?: string | null;
  estado?: string | null;
  estatus_pago?: string | null;
  resultado_tramite?: string | null;
  fecha_agenda?: string | null;
  vendedor_id?: string | null;
  vendedor_nombre?: string | null;
  actividades?: Actividad[] | null;
}

interface Perfil {
  id: string;
  rol?: string | null;
  nombre_completo?: string | null;
  nombre?: string | null;
  email?: string | null;
  correo?: string | null;
}

interface EtapaEmbudo {
  clave: string;
  nombre: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

interface ResumenVendedor {
  id: string;
  nombre: string;
  asignados: number;
  activos: number;
  enAgenda: number;
  cerradas: number;
  perdidas: number;
  conversion: number;
}

const normalizarTexto = (valor?: string | null): string =>
  (valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const coincideEtapa = (estadoActual: string | null | undefined, aliases: string[]): boolean => {
  const limpio = normalizarTexto(estadoActual);
  return aliases.some((alias) => limpio === normalizarTexto(alias) || limpio.includes(normalizarTexto(alias)));
};

export default function DashboardIndicadores() {
  const [cargando, setCargando] = useState(true);
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);

  const cargarIndicadores = async () => {
    setCargando(true);
    try {
      const [{ data: dataProspectos, error: errP }, { data: dataPerfiles, error: errU }] =
        await Promise.all([
          supabase.from('prospectos').select('*, actividades(*)'),
          supabase.from('perfiles').select('*')
        ]);

      if (errP) throw errP;
      if (errU) throw errU;

      setProspectos((dataProspectos as Prospecto[]) || []);
      setPerfiles((dataPerfiles as Perfil[]) || []);
    } catch (error) {
      console.error('Error al cargar indicadores:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarIndicadores();
  }, []);

  // --- CÁLCULO DE MÉTRICAS PRINCIPALES ---
  const totalProspectos = prospectos.length;

  const esFinalizado = (p: Prospecto) =>
    coincideEtapa(p.estado, ['Finalizado', 'Trámite Finalizado', 'Tramite Finalizado']);

  const esPerdido = (p: Prospecto) =>
    normalizarTexto(p.resultado_tramite) === 'denegado' ||
    coincideEtapa(p.estado, ['No_Interesado', 'No interesado', 'Perdido']);

  const esEnAgenda = (p: Prospecto) =>
    coincideEtapa(p.estado, ['En Pausa / Agenda', 'En Pausa', 'Agenda']);

  const ventasCerradas = prospectos.filter((p) => esFinalizado(p) && !esPerdido(p)).length;
  const ventasPerdidas = prospectos.filter((p) => esPerdido(p)).length;
  const enPausaAgenda = prospectos.filter((p) => esEnAgenda(p)).length;

  const prospectosActivos = prospectos.filter(
    (p) => !esFinalizado(p) && !esEnAgenda(p) && !esPerdido(p)
  ).length;

  const tasaConversion =
    totalProspectos > 0 ? Math.round((ventasCerradas / totalProspectos) * 100) : 0;

  // --- MÉTRICAS DE SEGUIMIENTO Y ALERTAS ---
  const hoyObj = new Date();
  const mananaObj = new Date();
  mananaObj.setDate(mananaObj.getDate() + 1);
  const mananaStr = mananaObj.toISOString().split('T')[0];

  let seguimientosUrgentes = 0;
  let sinContactoReciente = 0;

  prospectos.forEach((p) => {
    if (esFinalizado(p) || esPerdido(p)) return;

    const actividadesOrdenadas =
      p.actividades && p.actividades.length > 0
        ? [...p.actividades].sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
          )
        : [];

    const ultimaAct = actividadesOrdenadas[0] || null;
    const fechaAgenda = ultimaAct?.proximo_recontacto || p.fecha_agenda;

    if (fechaAgenda && fechaAgenda <= mananaStr) {
      seguimientosUrgentes += 1;
    }

    const fechaUltimoContacto = new Date(
      ultimaAct?.fecha_interaccion || p.created_at || hoyObj.toISOString()
    );
    const diasInactivo = Math.floor(
      (hoyObj.getTime() - fechaUltimoContacto.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diasInactivo >= 14) {
      sinContactoReciente += 1;
    }
  });

  // --- CONTROL DE PAGOS ---
  const pagosPendientes = prospectos.filter(
    (p) => !p.estatus_pago || normalizarTexto(p.estatus_pago) === 'pendiente'
  ).length;
  const conAbonoInicial = prospectos.filter((p) =>
    normalizarTexto(p.estatus_pago).includes('abono')
  ).length;
  const liquidados = prospectos.filter((p) =>
    normalizarTexto(p.estatus_pago).includes('liquidado')
  ).length;

  // --- EMBUDO DE CONVERSIÓN POR ETAPA ---
  const etapasBase = [
    {
      clave: 'etapa_1',
      nombre: '1. Contactos / Informes',
      aliases: ['Contactos / Informes', 'Nuevos', 'Contacto'],
      color: 'bg-[#00006a]'
    },
    {
      clave: 'etapa_2',
      nombre: '2. Asesoría / Documentos',
      aliases: ['Asesoría / Documentos', 'Asesoria / Documentos', 'Asesoria'],
      color: 'bg-blue-700'
    },
    {
      clave: 'etapa_3',
      nombre: '3. Prospectos (Primer Pago)',
      aliases: ['Prospectos (Primer Pago)', 'Primer Pago', 'Primer_Pago'],
      color: 'bg-indigo-600'
    },
    {
      clave: 'etapa_4',
      nombre: '4. Seguimiento General',
      aliases: ['Seguimiento General', 'Seguimiento'],
      color: 'bg-sky-600'
    },
    {
      clave: 'etapa_5',
      nombre: '5. Cita de Cierre',
      aliases: ['Cita de Cierre', 'Cita_Cierre', 'Cierre'],
      color: 'bg-[#fa0101]'
    },
    {
      clave: 'etapa_6',
      nombre: '6. Trámite Finalizado',
      aliases: ['Trámite Finalizado', 'Tramite Finalizado', 'Finalizado'],
      color: 'bg-emerald-600'
    }
  ];

  const embudo: EtapaEmbudo[] = etapasBase.map((etapa) => {
    const cantidad = prospectos.filter((p) => coincideEtapa(p.estado, etapa.aliases)).length;
    const porcentaje =
      totalProspectos > 0 ? Math.round((cantidad / totalProspectos) * 100) : 0;
    return {
      clave: etapa.clave,
      nombre: etapa.nombre,
      cantidad,
      porcentaje,
      color: etapa.color
    };
  });

  // --- RENDIMIENTO POR VENDEDOR ---
  const mapaPerfiles = new Map<string, string>();
  perfiles.forEach((pf) => {
    mapaPerfiles.set(
      pf.id,
      pf.nombre_completo || pf.nombre || pf.email || pf.correo || 'Usuario ACF'
    );
  });

  const mapaVendedores = new Map<string, ResumenVendedor>();

  prospectos.forEach((p) => {
    const key = p.vendedor_id || p.vendedor_nombre || 'sin_asignar';
    const nombre =
      (p.vendedor_id && mapaPerfiles.get(p.vendedor_id)) ||
      p.vendedor_nombre ||
      'Sin asignar / General';

    if (!mapaVendedores.has(key)) {
      mapaVendedores.set(key, {
        id: key,
        nombre,
        asignados: 0,
        activos: 0,
        enAgenda: 0,
        cerradas: 0,
        perdidas: 0,
        conversion: 0
      });
    }

    const row = mapaVendedores.get(key);
    if (!row) return;

    row.asignados += 1;

    if (esFinalizado(p) && !esPerdido(p)) {
      row.cerradas += 1;
    } else if (esPerdido(p)) {
      row.perdidas += 1;
    } else if (esEnAgenda(p)) {
      row.enAgenda += 1;
    } else {
      row.activos += 1;
    }
  });

  const tablaVendedores: ResumenVendedor[] = Array.from(mapaVendedores.values())
    .map((v) => ({
      ...v,
      conversion: v.asignados > 0 ? Math.round((v.cerradas / v.asignados) * 100) : 0
    }))
    .sort((a, b) => b.asignados - a.asignados);

  return (
    <div className="p-8 w-full flex flex-col flex-1 bg-slate-50">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-[#00006a]">
            📈 Dashboard Administrativo e Indicadores
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Análisis en tiempo real del embudo comercial, seguimientos pendientes y desempeño por vendedor.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void cargarIndicadores()}
          className="bg-[#00006a] hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
        >
          🔄 Actualizar Indicadores
        </button>
      </div>

      {cargando ? (
        <div className="text-center py-16 text-slate-500 font-bold">
          ⏳ Calculando métricas y embudo comercial...
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* FILA 1: TARJETAS KPI PRINCIPALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Prospectos</p>
              <p className="text-3xl font-black text-[#00006a] mt-2">{totalProspectos}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {enPausaAgenda} en pausa / agenda
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase">En Trámite Activo</p>
              <p className="text-3xl font-black text-blue-700 mt-2">{prospectosActivos}</p>
              <p className="text-[11px] text-slate-500 mt-1">Avanzando en Kanban</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm">
              <p className="text-xs font-bold text-emerald-700 uppercase">Ventas Cerradas</p>
              <p className="text-3xl font-black text-emerald-600 mt-2">{ventasCerradas}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {ventasPerdidas} denegadas / perdidas
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-sm">
              <p className="text-xs font-bold text-indigo-700 uppercase">Tasa Conversión</p>
              <p className="text-3xl font-black text-indigo-700 mt-2">{tasaConversion}%</p>
              <p className="text-[11px] text-slate-500 mt-1">Prospectos a cierre</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-red-200 shadow-sm">
              <p className="text-xs font-bold text-red-700 uppercase">Seguimientos Urgentes</p>
              <p className="text-3xl font-black text-[#fa0101] mt-2">{seguimientosUrgentes}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {sinContactoReciente} sin contacto (+14 días)
              </p>
            </div>
          </div>

          {/* FILA 2: EMBUDO DE CONVERSIÓN + ESTADO DE PAGOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Embudo Visual */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-5">
                <div>
                  <h2 className="text-base font-extrabold text-[#00006a]">
                    🔻 Embudo de Conversión por Etapa
                  </h2>
                  <p className="text-xs text-slate-500">
                    Distribución actual de prospectos para detectar etapas con mayor concentración o estancamiento.
                  </p>
                </div>
                <span className="text-xs font-bold bg-blue-50 text-[#00006a] px-3 py-1 rounded-full">
                  En Pausa / Agenda: {enPausaAgenda}
                </span>
              </div>

              <div className="space-y-3.5">
                {embudo.map((item) => (
                  <div key={item.clave} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>{item.nombre}</span>
                      <span>
                        {item.cantidad} ({item.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-lg h-6 overflow-hidden">
                      <div
                        className={`${item.color} h-6 rounded-lg transition-all flex items-center px-2.5`}
                        style={{
                          width: `${Math.max(item.porcentaje, item.cantidad > 0 ? 8 : 0)}%`
                        }}
                      >
                        {item.cantidad > 0 && (
                          <span className="text-[11px] font-bold text-white">
                            {item.cantidad}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen de Pagos y Salud del Seguimiento */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[#00006a] mb-1">
                  💰 Salud de Pagos y Cartera
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Control financiero de prospectos registrados.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100">
                    <span className="text-xs font-bold text-red-800">❌ Pendiente de Pago</span>
                    <span className="text-lg font-black text-red-700">{pagosPendientes}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="text-xs font-bold text-amber-800">💵 Abono Inicial</span>
                    <span className="text-lg font-black text-amber-700">{conAbonoInicial}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-xs font-bold text-emerald-800">✅ Liquidado</span>
                    <span className="text-lg font-black text-emerald-700">{liquidados}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <strong className="text-[#00006a] block mb-1">Alerta de seguimiento:</strong>
                {seguimientosUrgentes > 0 || sinContactoReciente > 0
                  ? `Tienes ${seguimientosUrgentes} recordatorio(s) urgente(s) y ${sinContactoReciente} contacto(s) con +14 días sin actividad.`
                  : 'Todo tu seguimiento comercial está al corriente.'}
              </div>
            </div>
          </div>

          {/* FILA 3: RENDIMIENTO POR VENDEDOR */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-base font-extrabold text-[#00006a] mb-1">
              👥 Desempeño por Vendedor
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Comparativa de prospectos asignados, activos, en agenda y tasa de conversión por responsable.
            </p>

            {tablaVendedores.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4">
                Aún no hay prospectos registrados para calcular desempeño por vendedor.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#00006a] text-white text-xs uppercase">
                      <th className="py-3 px-4 rounded-tl-xl">Vendedor / Responsable</th>
                      <th className="py-3 px-4 text-center">Asignados</th>
                      <th className="py-3 px-4 text-center">Activos</th>
                      <th className="py-3 px-4 text-center">En Agenda</th>
                      <th className="py-3 px-4 text-center">Cerradas</th>
                      <th className="py-3 px-4 text-center">Perdidas</th>
                      <th className="py-3 px-4 text-center rounded-tr-xl">% Conversión</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {tablaVendedores.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-800">{v.nombre}</td>
                        <td className="py-3 px-4 text-center font-bold text-[#00006a]">
                          {v.asignados}
                        </td>
                        <td className="py-3 px-4 text-center text-blue-700 font-semibold">
                          {v.activos}
                        </td>
                        <td className="py-3 px-4 text-center text-amber-700 font-semibold">
                          {v.enAgenda}
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-700 font-bold">
                          {v.cerradas}
                        </td>
                        <td className="py-3 px-4 text-center text-red-600 font-semibold">
                          {v.perdidas}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full font-extrabold bg-emerald-50 text-emerald-700">
                            {v.conversion}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}