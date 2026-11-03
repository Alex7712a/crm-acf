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

interface Props {
  onVolver: () => void;
}

export default function HistorialExcel({ onVolver }: Props) {
  const [clientes, setClientes] = useState<ClienteHistorico[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Cargar datos persistidos desde Supabase al iniciar
  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('historial_clientes')
        .select('*')
        .order('fecha_contacto', { ascending: false })
        .limit(500);

      if (error) throw error;
      if (data) setClientes(data);
    } catch (error) {
      console.error("Error al cargar el historial:", error);
    } finally {
      setCargando(false);
    }
  };

  // Función inteligente adaptada a los nombres exactos de tu Excel
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
        
        const datosBrutos = XLSX.utils.sheet_to_json<any>(hoja, { defval: "" });

        const datosMapeados = datosBrutos.map((row) => {
          const fechaRaw = row['Fecha de primer contacto'] || row['Fecha'] || row['FECHA'] || '';
          let fechaFormateada = String(fechaRaw || '-');
          if (typeof fechaRaw === 'number') {
            const fechaJs = new Date((fechaRaw - (25567 + 2)) * 86400 * 1000);
            fechaFormateada = fechaJs.toLocaleDateString() !== 'Invalid Date' 
              ? fechaJs.toLocaleDateString() 
              : String(fechaRaw);
          }

          return {
            fecha_contacto: fechaFormateada,
            responsable: String(row['Responsible'] || row['Responsable'] || 'General'),
            nombre_contacto: String(row['Nombre contacto en USA'] || row['Nombre Contacto USA'] || row['NOMBRE'] || 'Sin nombre'),
            telefono: String(row['Número de teléfono'] || row['Teléfono'] || row['TELEFONO'] || 'S/N'),
            pais: String(row['País'] || row['País / Estado'] || 'México'),
            estado_usa: String(row['Estado en el que se encuentra en USA'] || row['Estado USA'] || ''),
            familiares_traer: String(row['Familiar(es) que quiere traer'] || row['Familiar a Traer'] || '-'),
            medio: String(row['Medio por el que se enteró de ACF'] || row['Medio'] || '-'),
            estatus: String(row['Estatus'] || 'En Seguimiento'),
            notas_adicionales: String(row['Notas adicionales'] || row['Notas Adicionales'] || '-'),
          };
        }).filter(item => item.nombre_contacto && item.nombre_contacto !== 'Sin nombre');

        if (datosMapeados.length === 0) {
          alert('No se encontraron registros válidos en el archivo.');
          setCargando(false);
          return;
        }

        // Insertar permanentemente en Supabase
        const { error: errorInsert } = await supabase
          .from('historial_clientes')
          .insert(datosMapeados);

        if (errorInsert) {
          console.error("Detalle del error en Supabase:", errorInsert);
          alert(`Error de Supabase: ${errorInsert.message}`);
        } else {
          alert('¡Excel cargado y guardado permanentemente en la base de datos!');
          await cargarHistorial();
        }

      } catch (error) {
        alert('Error al leer el archivo Excel.');
        console.error("Error cargando Excel:", error);
      } finally {
        setCargando(false);
      }
    };

    lector.readAsBinaryString(archivo);
  };

  const clientesFiltrados = clientes.filter(cliente => 
    cliente.nombre_contacto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    cliente.telefono?.includes(busqueda) ||
    cliente.pais?.toLowerCase().includes(busqueda.toLowerCase()) ||
    cliente.familiares_traer?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6 flex flex-col h-full bg-slate-50 animate-fade-in">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
            📊 Base de Datos Histórica (Excel)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Buscador rápido de clientes, contacto en USA y familiar a traer.
          </p>
        </div>
        
        <div className="flex gap-3">
          <label className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-2">
            📁 Cargar Excel
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={manejarSubidaExcel} 
              className="hidden" 
            />
          </label>

          <button 
            onClick={onVolver}
            className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-300 transition-colors flex items-center gap-2"
          >
            ⬅️ Volver al Tablero Kanban
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
        <span className="text-2xl">🔍</span>
        <input 
          type="text" 
          placeholder="Buscar por nombre en USA, teléfono, país o familiar a traer..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full text-lg outline-none text-slate-700 placeholder-slate-400"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
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
                    {busqueda ? 'No se encontraron registros.' : 'Sube tu archivo Excel para ver los datos guardados aquí.'}
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente, index) => (
                  <tr key={cliente.id || index} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="p-4 text-sm font-medium text-slate-600">{cliente.fecha_contacto || '-'}</td>
                    <td className="p-4 text-sm font-bold text-slate-500">{cliente.responsable || '-'}</td>
                    <td className="p-4 font-bold text-emerald-900">{cliente.nombre_contacto || '-'}</td>
                    <td className="p-4 font-medium text-slate-600">{cliente.telefono || 'S/N'}</td>
                    <td className="p-4 text-sm text-slate-600">
                      {cliente.pais || ''} <span className="text-slate-400">{cliente.estado_usa ? `(${cliente.estado_usa})` : ''}</span>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-700">{cliente.familiares_traer || '-'}</td>
                    <td className="p-4 text-sm">
                      <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide">
                        {cliente.estatus || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500 max-w-[250px] truncate" title={cliente.notas_adicionales}>
                      {cliente.notas_adicionales || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}