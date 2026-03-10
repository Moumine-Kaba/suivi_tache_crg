import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests (doit être en premier)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Récupérer les données de la requête
    const { email, password, name, nom, prenom, matricule, role, direction, fonction, gender, mustChangePassword } = await req.json()

    const displayName = name || [prenom, nom].filter(Boolean).join(' ').trim() || nom || prenom || email?.split('@')[0]
    if (!email || !password || !displayName || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, password, nom/prénom et role sont requis' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const allowedDomain = (Deno.env.get('ALLOWED_EMAIL_DOMAIN') || 'creditruralgn.com').replace(/^@/, '')
    if (!email.toLowerCase().endsWith('@' + allowedDomain.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: `Seuls les emails @${allowedDomain} sont autorisés.` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!email.toLowerCase().endsWith('@creditruralgn.com')) {
      return new Response(
        JSON.stringify({ error: 'Seuls les emails @creditruralgn.com peuvent être créés.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Créer le client Supabase Admin avec la clé service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Vérifier que l'utilisateur qui fait la requête est admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      )
    }

    // Vérifier le token et le rôle de l'utilisateur
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        },
      )
    }

    // Vérifier que l'utilisateur est admin et actif
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('role, is_active')
      .eq('id', authUser.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Accès non autorisé. Seul l\'admin peut créer des utilisateurs.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        },
      )
    }
    if (userProfile?.is_active === false) {
      return new Response(
        JSON.stringify({ error: 'Votre compte administrateur est désactivé.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        },
      )
    }

    // Seul l'admin peut créer des directrices (vérifié ci-dessus)

    // Créer l'utilisateur dans Supabase Auth avec email confirmé
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmer automatiquement l'email
      user_metadata: {
        name: displayName,
        nom: nom || displayName,
        prenom: prenom || null,
        role,
        direction: direction || null,
        fonction: fonction || null,
      }
    })

    if (createUserError) {
      console.error('Erreur lors de la création dans Auth:', createUserError)
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création dans Supabase Auth: ${createUserError.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Aucun utilisateur n\'a été créé dans Supabase Auth' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Attendre que l'utilisateur Auth soit visible (évite users_id_fkey)
    await new Promise((r) => setTimeout(r, 800))

    // Créer ou mettre à jour l'utilisateur dans la table users (UPSERT pour gérer le trigger)
    const genderVal = gender && ['M', 'F'].includes(String(gender).toUpperCase()) ? String(gender).toUpperCase() : null
    const userPayload = {
      id: authData.user.id,
      email,
      username: email.split('@')[0],
      nom: nom || displayName,
      prenom: prenom || null,
      matricule: matricule || null,
      role,
      direction: direction || null,
      fonction: fonction || null,
      gender: genderVal,
      is_active: true,
      must_change_password: mustChangePassword === true,
    }

    let userData: Record<string, unknown> | null = null
    let userError: { code?: string; message?: string } | null = null

    // Tentative avec retry (users_id_fkey peut survenir si auth n'est pas encore propagé)
    for (let attempt = 1; attempt <= 3; attempt++) {
      const result = await supabaseAdmin
        .from('users')
        .upsert(userPayload, { onConflict: 'id', ignoreDuplicates: false })
        .select()
        .single()

      userError = result.error as { code?: string; message?: string } | null
      userData = result.data as Record<string, unknown> | null

      if (!userError) break
      if (userError.message?.includes('users_id_fkey') && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt))
        continue
      }
      break
    }

    if (userError) {
      console.error('Erreur lors de la création dans users:', userError)
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création dans users: ${userError.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const u = userData || {}
    // Pas d'envoi d'email : l'admin communique le mot de passe temporaire à l'utilisateur.
    // À la première connexion, l'utilisateur devra changer son mot de passe.

    // Audit log
    try {
      await supabaseAdmin.from('audit_log').insert({
        action: 'utilisateur_créé',
        table_name: 'users',
        record_id: authData.user.id,
        actor_id: authUser.id,
        actor_email: authUser.email,
        actor_role: 'admin',
        new_data: {
          email,
          nom: nom || displayName,
          prenom: prenom || null,
          matricule: matricule || null,
          role,
          direction: direction || null,
          fonction: fonction || null,
          must_change_password: mustChangePassword === true,
        },
      })
    } catch (e) {
      console.warn('Audit log insert:', e)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: u.id ?? authData.user.id,
          email: u.email ?? email,
          name: u.nom ?? u.username ?? displayName,
          nom: u.nom ?? nom ?? displayName,
          prenom: u.prenom ?? prenom ?? null,
          matricule: u.matricule ?? matricule ?? null,
          username: u.username ?? email.split('@')[0],
          role: u.role ?? role,
          direction: u.direction ?? direction ?? null,
          fonction: u.fonction ?? fonction ?? null,
          gender: u.gender ?? genderVal,
          isActive: u.is_active ?? true,
          mustChangePassword: u.must_change_password ?? mustChangePassword === true,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        },
        authCreated: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Erreur dans create-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de la création de l\'utilisateur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})













