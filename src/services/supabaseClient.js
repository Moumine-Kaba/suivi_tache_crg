import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Fetch avec retry pour gérer ERR_CONNECTION_RESET / Failed to fetch
const fetchWithRetry = async (url, options = {}, retries = 2) => {
  let lastError
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options)
      return res
    } catch (e) {
      lastError = e
      if (i < retries && (e?.name === 'TypeError' || e?.message?.includes('fetch') || e?.message?.includes('Failed to fetch'))) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
        continue
      }
      throw e
    }
  }
  throw lastError
}

// Créer le client Supabase avec fetch personnalisé (retry sur erreurs réseau)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    global: {
      fetch: fetchWithRetry,
    },
  }
)

// Avertir si les variables ne sont pas définies (mais ne pas bloquer le rendu)
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Variables Supabase manquantes dans .env')
  console.warn('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? '✅' : '❌')
  console.warn('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅' : '❌')
  console.warn('L\'application fonctionnera en mode dégradé (données mockées)')
}

