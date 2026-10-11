import { createClient } from '@supabase/supabase-js'

// ¡Esta sí es la URL real de tu proyecto en Supabase!
const supabaseUrl = 'https://bsucakansxeioqcgkime.supabase.co'

// Clave pública (Si te marca error de llave, asegúrate de que tu clave anon empiece con "eyJ...")
const supabaseAnonKey = 'sb_publishable_ZNeZGxwSP91ieQp2Ch212A_0KDV80uz'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)