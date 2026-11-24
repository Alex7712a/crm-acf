import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Dashboard from './Dashboard';
import Login from './Login';

function App() {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error buscando el rol:', error);
        return;
      }

      if (data) {
        setUserRole(data.rol);
      }
    } catch (err) {
      console.error('Error inesperado al buscar rol:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserRole(session.user.id);
      }
      setCargandoSesion(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (cargandoSesion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-[#00006a] font-bold">
        Cargando sistema...
      </div>
    );
  }

  if (session) {
    return <Dashboard session={session} userRole={userRole} />;
  }

  return <Login />;
}

export default App;