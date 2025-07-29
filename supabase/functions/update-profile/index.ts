import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Lida com o pedido de permissão (OPTIONS) do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Pega os dados que o frontend enviou (novo nome e/ou nova URL de avatar)
    const { fullName, avatarUrl } = await req.json()

    // Cria um cliente Supabase com a chave de 'service_role' (o passe livre)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Pega o usuário que fez a chamada a partir do token de autenticação
    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser()

    if (!user) {
      throw new Error('Usuário não autenticado.')
    }

    // Monta o objeto de dados para atualização
    const updates = {
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    }

    // Executa o update na tabela 'profiles' usando o passe livre
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', user.id) // Garante que só atualize o perfil do usuário correto

    if (error) {
      throw error
    }

    // Retorna uma resposta de sucesso
    return new Response(JSON.stringify({ message: 'Perfil atualizado com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})