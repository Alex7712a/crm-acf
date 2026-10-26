import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Dashboard from './Dashboard'; 

function App() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // 1. Nuevo estado para guardar el rol
  const [userRole, setUserRole] = useState<string | null>(null);

  // 2. Nueva función para buscar el rol en la base de datos
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error buscando el rol:", error);
        return;
      }
      
      if (data) {
        setUserRole(data.rol);
        console.log("Rol cargado exitosamente:", data.rol);
      }
    } catch (err) {
      console.error("Error inesperado al buscar rol:", err);
    }
  };

  useEffect(() => {
    // 3. Modificamos el useEffect para que busque el rol cuando hay sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null); // Limpiamos el rol si cierra sesión
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
    } catch (error: any) {
      alert('Error de ingreso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    // 4. Le pasamos el userRole al Dashboard para que pueda usarlo
    return <Dashboard session={session} userRole={userRole} />;
  }

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

          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-[#00006a] tracking-tight">
              Amor Cruzando <br/> Fronteras
            </h2>
            <p className="mt-2 text-[#00006a]/70 font-bold text-xs tracking-widest uppercase">
              Plataforma CRM de Gestión
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-bold text-[#00006a] mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-[#00006a] font-medium bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-0 focus:border-[#00006a] transition-colors shadow-inner"
                placeholder="admin@acf.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#00006a] mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-[#00006a] font-black tracking-widest bg-gray-50 hover:bg-gray-100 focus:bg-white focus:outline-none focus:ring-0 focus:border-[#00006a] transition-colors shadow-inner"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border-2 border-[#fa0101] rounded-xl shadow-[0_8px_20px_-6px_rgba(250,1,1,0.5)] text-sm font-black text-white bg-[#fa0101] hover:bg-white hover:text-[#fa0101] focus:outline-none transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cargando...' : 'Ingresar al sistema'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;