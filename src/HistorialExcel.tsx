import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface ClienteHistorico {
  id: string;
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

  useEffect(() => {
    const cargarHistorial = async () => {
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
    cargarHistorial();
  }, []);

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
            Buscador rápido de clientes y prospectos antiguos.
          </p>
        </div>
        
        <button 
          onClick={onVolver}
          className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-300 transition-colors flex items-center gap-2"
        >
          ⬅️ Volver al Tablero Kanban
        </button>
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
                    Cargando base de datos...
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    {busqueda ? 'No se encontraron registros.' : 'Sube tu archivo CSV en Supabase para ver los datos aquí.'}
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente, index) => (
                  <tr key={cliente.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
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