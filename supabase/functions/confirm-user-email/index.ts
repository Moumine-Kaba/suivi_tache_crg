import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupérer les données de la requête
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId est requis' }),
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
        JSON.stringify({ error: 'Accès non autorisé. Seul l\'admin peut activer les comptes.' }),
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

    // Récupérer les infos du compte à activer
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('email, nom, role')
      .eq('id', userId)
      .single()

    // Confirmer l'email de l'utilisateur
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true,
      }
    )

    if (updateError) {
      console.error('Erreur lors de la confirmation de l\'email:', updateError)
      return new Response(
        JSON.stringify({ error: `Erreur lors de la confirmation de l'email: ${updateError.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Mettre à jour aussi dans la table users pour s'assurer que is_active est true
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .update({ is_active: true })
      .eq('id', userId)
      .select()
      .single()

    if (userError) {
      console.warn('Avertissement lors de la mise à jour de users:', userError)
      // Ne pas échouer si la mise à jour de users échoue, l'important est que l'email soit confirmé
    }

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      action: 'compte_activé',
      table_name: 'users',
      record_id: userId,
      actor_id: authUser.id,
      actor_email: authUser.email,
      actor_role: 'admin',
      new_data: {
        email: targetUser?.email ?? updatedUser.user.email,
        nom: targetUser?.nom,
        role: targetUser?.role,
      },
    }).catch((e) => console.warn('Audit log insert:', e))

    // Notification à l'utilisateur activé
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type: 'compte_activé',
      title: 'Compte activé',
      message: 'Votre compte a été validé par un administrateur. Vous pouvez maintenant vous connecter.',
      read: false,
    }).catch((e) => console.warn('Notification insert:', e))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Compte activé avec succès',
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
          email_confirmed_at: updatedUser.user.email_confirmed_at,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Erreur dans confirm-user-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de l\'activation du compte' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})













