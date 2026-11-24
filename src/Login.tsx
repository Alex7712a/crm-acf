import React, { useState } from 'react';
import { supabase } from './supabase';

// Claves de acceso por rol
const CODIGO_VENDEDOR = 'ACF2026';
const CODIGO_ADMIN = 'ACFADMIN2026';

export default function Login() {
  const [esRegistro, setEsRegistro] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [lada, setLada] = useState('+52');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codigoAcceso, setCodigoAcceso] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cambiarModo = () => {
    setEsRegistro(!esRegistro);
    setNombreCompleto('');
    setLada('+52');
    setTelefono('');
    setEmail('');
    setPassword('');
    setCodigoAcceso('');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (esRegistro) {
        const codigoLimpio = codigoAcceso.trim().toUpperCase();
        let rolAsignado = '';

        if (codigoLimpio === CODIGO_ADMIN) {
          rolAsignado = 'admin';
        } else if (codigoLimpio === CODIGO_VENDEDOR) {
          rolAsignado = 'vendedor';
        } else {
          setErrorMsg('Código de empresa incorrecto. Solicítalo a un administrador.');
          setLoading(false);
          return;
        }

        const telefonoCompleto = `${lada} ${telefono.trim()}`;

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              nombre_completo: nombreCompleto.trim(),
              telefono: telefonoCompleto,
              rol: rolAsignado,
            },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-[#00006a]/5 transform -skew-y-6 -translate-y-24 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-[#fa0101]/5 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative mt-16 z-10">
        <div className="bg-white pt-20 pb-10 px-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-3xl border border-gray-200 relative">
          
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white ring-4 ring-gray-100 overflow-hidden group">
              <img
                src="/Feliz_ACF.jpeg"
                alt="Mascota Feliz Amor Cruzando Fronteras"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-3xl font-black text-[#00006a] tracking-tight">
              Amor Cruzando <br /> Fronteras
            </h2>
            <p className="mt-2 text-[#00006a]/70 font-bold text-xs tracking-widest uppercase">
              {esRegistro ? 'Registro de Nuevo Usuario' : 'Plataforma CRM de Gestión'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#fa0101] text-xs font-bold text-center">
              {errorMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
            {esRegistro && (
              <>
                <div>
                  <label className="block text-sm font-bold text-[#00006a] mb-1.5">
                    Código de empresa
                  </label>
                  <input
                    type="text"
                    value={codigoAcceso}
                    onChange={(e) => setCodigoAcceso(e.target.value)}
                    required
                    autoComplete="off"
                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-[#00006a] font-bold uppercase tracking-wider bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:border-[#00006a] transition-colors shadow-inner"
                    placeholder="Clave proporcionada por ACF"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#00006a] mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    required
                    autoComplete="name"
                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-[#00006a] font-medium bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:border-[#00006a] transition-colors shadow-inner"
                    placeholder="Ej. María López"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#00006a] mb-1.5">
                    Teléfono
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={lada}
                      onChange={(e) => setLada(e.target.value)}
                      className="px-3 py-3 border-2 border-gray-200 rounded-xl text-[#00006a] font-bold bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:border-[#00006a] transition-colors shadow-inner"
                    >
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+1">🇺🇸 +1</option>
                    </select>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value.replace(/[^0-9\s-]/g, ''))}
                      required
                      minLength={10}
                      maxLength={14}
                      autoComplete="tel-national"
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-[#00006a] font-medium bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:border-[#00006a] transition-colors shadow-inner"
                      placeholder="10 dígitos"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-bold text-[#00006a] mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete={esRegistro ? 'off' : 'email'}
                className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-[#00006a] font-medium bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:border-[#00006a] transition-colors shadow-inner"
                placeholder="correo@amorcruzandofronteras.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#00006a] mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={esRegistro ? 'new-password' : 'current-password'}
                className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-[#00006a] font-black tracking-widest bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:border-[#00006a] transition-colors shadow-inner"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border-2 border-[#fa0101] rounded-xl shadow-[0_8px_20px_-6px_rgba(250,1,1,0.5)] text-sm font-black text-white bg-[#fa0101] hover:bg-white hover:text-[#fa0101] focus:outline-none transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? 'Procesando...'
                  : esRegistro
                  ? 'Crear cuenta y entrar'
                  : 'Ingresar al sistema'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={cambiarModo}
              className="text-xs font-bold text-[#00006a] hover:text-[#fa0101] transition-colors underline"
            >
              {esRegistro
                ? '¿Ya tienes una cuenta? Inicia sesión aquí'
                : '¿Nuevo en el equipo? Regístrate aquí'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}