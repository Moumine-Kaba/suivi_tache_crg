/**
 * Inscription sécurisée - Personnel Crédit Rural de Guinée uniquement
 * Validation backend stricte : domaine @creditruralgn.com, mot de passe, rate limiting
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_DOMAIN = 'creditruralgn.com'
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 heure
const RATE_LIMIT_MAX_ATTEMPTS = 5

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Validation mot de passe : min 8 car., lettres et chiffres */
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une lettre.' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre.' }
  }
  return { valid: true }
}

/** Vérifie le rate limiting par IP (max 5 tentatives/heure) */
async function checkRateLimit(admin: ReturnType<typeof createClient>, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const actions = ['inscription_tentative', 'inscription_refusee_domaine', 'inscription_refusee_mot_de_passe', 'inscription_reussie']
  let q = admin.from('security_logs').select('*', { count: 'exact', head: true }).in('action', actions).gte('created_at', since)
  if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    q = q.eq('ip_address', ip)
  }
  const { count } = await q
  return (count ?? 0) < RATE_LIMIT_MAX_ATTEMPTS
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, password, name, direction, fonction, role, gender } = await req.json()
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'

    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, mot de passe, nom et rôle sont requis.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const validIp = /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? ip : null
    const logPayload = (action: string, success: boolean, details?: Record<string, unknown>) => ({
      action,
      email: String(email).trim().toLowerCase(),
      ip_address: validIp,
      success,
      details: { ...details, ip },
    })

    // 1. Validation domaine email (backend strict)
    const emailLower = String(email).trim().toLowerCase()
    if (!emailLower.endsWith('@' + ALLOWED_DOMAIN)) {
      await admin.from('security_logs').insert(logPayload('inscription_refusee_domaine', false, { reason: 'domaine_non_autorise' }))
      return new Response(
        JSON.stringify({ error: 'Inscription réservée au personnel de Crédit Rural de Guinée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // 2. Validation mot de passe
    const pwCheck = validatePassword(password)
    if (!pwCheck.valid) {
      await admin.from('security_logs').insert(logPayload('inscription_refusee_mot_de_passe', false, { reason: pwCheck.message }))
      return new Response(
        JSON.stringify({ error: pwCheck.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 3. Rate limiting
    const allowed = await checkRateLimit(admin, ip)
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives. Réessayez dans 1 heure.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // 4. Rôle autorisé (employe ou chef uniquement pour auto-inscription)
    if (role !== 'employe' && role !== 'chef') {
      return new Response(
        JSON.stringify({ error: 'L\'inscription n\'est autorisée que pour les employés et chefs de service.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 5. Créer l'utilisateur (email_confirm: false = envoi email de confirmation)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: emailLower,
      password,
      email_confirm: false, // Compte inactif jusqu'à confirmation email
      user_metadata: {
        name,
        role,
        direction: direction || null,
        fonction: fonction || null,
        gender: gender && ['M', 'F'].includes(String(gender).toUpperCase()) ? String(gender).toUpperCase() : null,
      },
    })

    if (authError) {
      await admin.from('security_logs').insert(logPayload('inscription_tentative', false, { error: authError.message }))
      if (authError.message?.includes('already') || authError.message?.includes('exists')) {
        return new Response(
          JSON.stringify({ error: 'Cet email est déjà enregistré. Veuillez vous connecter.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      return new Response(
        JSON.stringify({ error: authError.message || 'Erreur lors de l\'inscription.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 6. Log succès
    await admin.from('security_logs').insert({
      action: 'inscription_reussie',
      email: emailLower,
      user_id: authData.user?.id,
      ip_address: validIp,
      success: true,
      details: { role, ip },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inscription réussie. Vérifiez votre boîte mail (@creditruralgn.com) pour confirmer votre compte.',
        user: { id: authData.user?.id, email: authData.user?.email },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error('secure-register error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur serveur lors de l\'inscription.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
