import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';

interface ClienteHistorico {
  id?: string;
  responsable: string;
  fecha_contacto: string;
  pais: string;
  estado_usa: string;
  nombre_contacto: string;
  familiares_traer: string;
  telefono: string;
  medio: string;
  estatus: string;
  notas_adicionales: string;
}

interface TramiteFinalizadoCRM {
  id: string;
  created_at?: string;
  nombre_cliente: string;
  telefono?: string | null;
  nacionalidad?: string | null;
  tipo_tramite?: string | null;
  tipo_paquete?: string | null;
  estatus_pago?: string | null;
  resultado_tramite?: string | null;
  vendedor_nombre?: string | null;
  titular_estado_eeuu?: string | null;
  familiar_nombre?: string | null;
  familiar_pais?: string | null;
  medio_contacto?: string | null;
}

interface Props {
  onVolver: () => void;
}

export default function HistorialExcel({ onVolver }: Props) {
  const [pestana, setPestana] = useState<'crm' | 'excel'>('crm');
  const [clientes, setClientes] = useState<ClienteHistorico[]>([]);
  const [finalizadosCRM, setFinalizadosCRM] = useState<TramiteFinalizadoCRM[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargarTodo = async () => {
    setCargando(true);
    try {
      const [{ data: dataHistorial, error: errH }, { data: dataCRM, error: errC }] =
        await Promise.all([
          supabase
            .from('historial_clientes')
            .select('*')
            .order('fecha_contacto', { ascending: false })
            .limit(500),
          supabase
            .from('prospectos')
            .select('*')
            .eq('estado', 'Finalizado')
            .order('created_at', { ascending: false })
        ]);

      if (errH) throw errH;
      if (errC) throw errC;

      setClientes((dataHistorial as ClienteHistorico[]) || []);
      setFinalizadosCRM((dataCRM as TramiteFinalizadoCRM[]) || []);
    } catch (error) {
      console.error('Error al cargar el historial:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarTodo();
  }, []);

  const manejarSubidaExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setCargando(true);
    const lector = new FileReader();

    lector.onload = async (evento) => {
      try {
        const bstr = evento.target?.result;
        const libro = XLSX.read(bstr, { type: 'binary' });
        const nombreHoja = libro.SheetNames[0];
        const hoja = libro.Sheets[nombreHoja];

        const datosBrutos = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' });

        const datosMapeados = datosBrutos
          .map((row) => {
            const fechaRaw = row['Fecha de primer contacto'] || row['Fecha'] || row['FECHA'] || '';
            let fechaFormateada = String(fechaRaw || '-');
            if (typeof fechaRaw === 'number') {
              const fechaJs = new Date((fechaRaw - (25567 + 2)) * 86400 * 1000);
              fechaFormateada =
                fechaJs.toLocaleDateString() !== 'Invalid Date'
                  ? fechaJs.toLocaleDateString()
                  : String(fechaRaw);
            }

            return {
              fecha_contacto: fechaFormateada,
              responsable: String(row['Responsible'] || row['Responsable'] || 'General'),
              nombre_contacto: String(
                row['Nombre contacto en USA'] || row['Nombre Contacto USA'] || row['NOMBRE'] || 'Sin nombre'
              ),
              telefono: String(row['Número de teléfono'] || row['Teléfono'] || row['TELEFONO'] || 'S/N'),
              pais: String(row['País'] || row['País / Estado'] || 'México'),
              estado_usa: String(row['Estado en el que se encuentra en USA'] || row['Estado USA'] || ''),
              familiares_traer: String(row['Familiar(es) que quiere traer'] || row['Familiar a Traer'] || '-'),
              medio: String(row['Medio por el que se enteró de ACF'] || row['Medio'] || '-'),
              estatus: String(row['Estatus'] || 'En Seguimiento'),
              notas_adicionales: String(row['Notas adicionales'] || row['Notas Adicionales'] || '-')
            };
          })
          .filter((item) => item.nombre_contacto && item.nombre_contacto !== 'Sin nombre');

        if (datosMapeados.length === 0) {
          alert('No se encontraron registros válidos en el archivo.');
          setCargando(false);
          return;
        }

        const { error: errorInsert } = await supabase
          .from('historial_clientes')
          .insert(datosMapeados);

        if (errorInsert) {
          console.error('Detalle del error en Supabase:', errorInsert);
          alert(`Error de Supabase: ${errorInsert.message}`);
        } else {
          alert('¡Excel cargado y guardado permanentemente en la base de datos!');
          setPestana('excel');
          await cargarTodo();
        }
      } catch (error) {
        alert('Error al leer el archivo Excel.');
        console.error('Error cargando Excel:', error);
      } finally {
        setCargando(false);
      }
    };

    lector.readAsBinaryString(archivo);
  };

  const exportarFinalizadosExcel = () => {
    if (finalizadosCRM.length === 0) {
      alert('Aún no hay trámites finalizados en el CRM para exportar.');
      return;
    }

    const filas = finalizadosCRM.map((item) => ({
      'Fecha Registro': item.created_at ? item.created_at.split('T')[0] : '-',
      'Responsable': item.vendedor_nombre || 'CRM ACF',
      'Cliente': item.nombre_cliente,
      'Teléfono': item.telefono || 'S/N',
      'País / Ubicación': item.nacionalidad || item.familiar_pais || 'México',
      'Estado EE. UU.': item.titular_estado_eeuu || '-',
      'Trámite': item.tipo_tramite || 'Visa de Turista',
      'Estado de Pago': item.estatus_pago || 'Pendiente',
      'Resultado': item.resultado_tramite || 'Finalizado'
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Finalizados_CRM');
    XLSX.writeFile(libro, `Historial_Finalizados_ACF_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const termino = busqueda.toLowerCase();

  const clientesFiltrados = clientes.filter(
    (cliente) =>
      cliente.nombre_contacto?.toLowerCase().includes(termino) ||
      cliente.telefono?.includes(busqueda) ||
      cliente.pais?.toLowerCase().includes(termino) ||
      cliente.familiares_traer?.toLowerCase().includes(termino)
  );

  const crmFiltrados = finalizadosCRM.filter(
    (item) =>
      item.nombre_cliente?.toLowerCase().includes(termino) ||
      (item.telefono || '').includes(busqueda) ||
      (item.nacionalidad || '').toLowerCase().includes(termino) ||
      (item.vendedor_nombre || '').toLowerCase().includes(termino)
  );

  return (
    <div className="p-6 flex flex-col h-full bg-slate-50">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            📊 Historial de Trámites y Base Excel
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Consulta los trámites concluidos en el CRM y la base histórica importada desde Excel.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportarFinalizadosExcel}
            className="bg-[#00006a] hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            📥 Descargar Excel (.xlsx)
          </button>

          <label className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2">
            📁 Cargar Excel
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={manejarSubidaExcel}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onVolver}
            className="bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-300 transition-colors flex items-center gap-2 cursor-pointer"
          >
            ⬅️ Volver al Kanban
          </button>
        </div>
      </div>

      {/* Selector de pestañas */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setPestana('crm')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            pestana === 'crm'
              ? 'bg-[#00006a] text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          ✅ Trámites Finalizados del CRM ({finalizadosCRM.length})
        </button>

        <button
          type="button"
          onClick={() => setPestana('excel')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            pestana === 'excel'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          📁 Base Histórica Importada ({clientes.length})
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 mb-5 flex gap-3 items-center">
        <span className="text-xl">🔍</span>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono, país o vendedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full text-sm outline-none text-slate-700 placeholder-slate-400"
        />
      </div>

      {/* Tabla según pestaña activa */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          {pestana === 'crm' ? (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[#00006a] text-white">
                  <th className="p-4 font-bold text-xs uppercase">Fecha</th>
                  <th className="p-4 font-bold text-xs uppercase">Responsable</th>
                  <th className="p-4 font-bold text-xs uppercase">Cliente / Expediente</th>
                  <th className="p-4 font-bold text-xs uppercase">Teléfono</th>
                  <th className="p-4 font-bold text-xs uppercase">Ubicación</th>
                  <th className="p-4 font-bold text-xs uppercase">Trámite</th>
                  <th className="p-4 font-bold text-xs uppercase">Pago</th>
                  <th className="p-4 font-bold text-xs uppercase">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00006a] mx-auto mb-2"></div>
                      Cargando expedientes finalizados...
                    </td>
                  </tr>
                ) : crmFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      {busqueda
                        ? 'No se encontraron trámites finalizados con esa búsqueda.'
                        : 'Aún no hay trámites finalizados en el CRM. Al cerrar un expediente aparecerá aquí automáticamente.'}
                    </td>
                  </tr>
                ) : (
                  crmFiltrados.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="p-4 text-xs font-medium text-slate-600">
                        {item.created_at ? item.created_at.split('T')[0] : '-'}
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-600">
                        {item.vendedor_nombre || 'CRM ACF'}
                      </td>
                      <td className="p-4 text-sm font-bold text-[#00006a]">{item.nombre_cliente}</td>
                      <td className="p-4 text-xs font-medium text-slate-600">{item.telefono || 'S/N'}</td>
                      <td className="p-4 text-xs text-slate-600">{item.nacionalidad || 'México'}</td>
                      <td className="p-4 text-xs font-semibold text-blue-700">
                        {item.tipo_tramite || 'Visa de Turista'}
                      </td>
                      <td className="p-4 text-xs">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold ${
                            item.estatus_pago === 'Liquidado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.estatus_pago === 'Liquidado'
                            ? '✅ Liquidado'
                            : item.estatus_pago === 'Abono_Inicial'
                            ? '💵 Abono Inicial'
                            : '❌ Pendiente'}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold ${
                            item.resultado_tramite === 'Denegado'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.resultado_tramite === 'Denegado' ? '❌ Denegado' : '✅ Aprobado'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-emerald-800 text-white">
                  <th className="p-4 font-bold text-sm">Fecha</th>
                  <th className="p-4 font-bold text-sm">Responsable</th>
                  <th className="p-4 font-bold text-sm">Nombre Contacto USA</th>
                  <th className="p-4 font-bold text-sm">Teléfono</th>
                  <th className="p-4 font-bold text-sm">País / Estado</th>
                  <th className="p-4 font-bold text-sm">Familiar a Traer</th>
                  <th className="p-4 font-bold text-sm">Estatus</th>
                  <th className="p-4 font-bold text-sm">Notas Adicionales</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800 mx-auto mb-2"></div>
                      Sincronizando base de datos...
                    </td>
                  </tr>
                ) : clientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      {busqueda
                        ? 'No se encontraron registros.'
                        : 'Sube tu archivo Excel para ver los datos históricos aquí.'}
                    </td>
                  </tr>
                ) : (
                  clientesFiltrados.map((cliente, index) => (
                    <tr
                      key={cliente.id || index}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="p-4 text-sm font-medium text-slate-600">{cliente.fecha_contacto || '-'}</td>
                      <td className="p-4 text-sm font-bold text-slate-500">{cliente.responsable || '-'}</td>
                      <td className="p-4 font-bold text-emerald-900">{cliente.nombre_contacto || '-'}</td>
                      <td className="p-4 font-medium text-slate-600">{cliente.telefono || 'S/N'}</td>
                      <td className="p-4 text-sm text-slate-600">
                        {cliente.pais || ''}{' '}
                        <span className="text-slate-400">
                          {cliente.estado_usa ? `(${cliente.estado_usa})` : ''}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-700">
                        {cliente.familiares_traer || '-'}
                      </td>
                      <td className="p-4 text-sm">
                        <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide">
                          {cliente.estatus || 'N/A'}
                        </span>
                      </td>
                      <td
                        className="p-4 text-xs text-slate-500 max-w-[250px] truncate"
                        title={cliente.notas_adicionales}
                      >
                        {cliente.notas_adicionales || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}