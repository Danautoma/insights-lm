// /supabase/functions/generate-notebook-content/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- 1. Verificação de Segredos ---
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SERVICE_ROLE_KEY, // Chave de admin com nome corrigido
  NOTEBOOK_GENERATION_URL, // URL do seu serviço/webhook
  NOTEBOOK_GENERATION_AUTH, // Token de autenticação para o serviço
} = Deno.env.toObject();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY || !NOTEBOOK_GENERATION_URL || !NOTEBOOK_GENERATION_AUTH) {
  console.error("ERRO CRÍTICO: Uma ou mais variáveis de ambiente faltando em generate-notebook-content.");
}

serve(async (req) => {
  // Responde imediatamente à requisição de pre-voo (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- 2. Autenticação do Usuário ---
    // Garante que apenas usuários logados podem chamar esta função
    const userSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });
    const { data: { user } } = await userSupabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- 3. Início da sua Lógica de Negócio ---
    const { notebookId, filePath, sourceType } = await req.json();

    if (!notebookId || !sourceType) {
      return new Response(JSON.stringify({ error: 'notebookId e sourceType são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cliente Admin para realizar tarefas com privilégios elevados
    const adminSupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Atualiza o status do notebook para 'generating'
    await adminSupabaseClient
      .from('notebooks')
      .update({ generation_status: 'generating' })
      .eq('id', notebookId);

    // Prepara o payload para o serviço externo
    const payload = {
      sourceType: sourceType,
      filePath: filePath, // filePath pode ser a URL do R2 ou null
    };

    // Chama o serviço web externo (seu n8n, etc.)
    const response = await fetch(NOTEBOOK_GENERATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': NOTEBOOK_GENERATION_AUTH,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro no serviço web:', response.status, errorText);
      await adminSupabaseClient.from('notebooks').update({ generation_status: 'failed' }).eq('id', notebookId);
      return new Response(JSON.stringify({ error: 'Falha ao gerar conteúdo do serviço web' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const generatedData = await response.json();

    // Processa a resposta do serviço
    const output = generatedData?.output;
    if (!output || !output.title) {
      console.error('Formato de resposta inesperado do serviço web:', generatedData);
      await adminSupabaseClient.from('notebooks').update({ generation_status: 'failed' }).eq('id', notebookId);
      return new Response(JSON.stringify({ error: 'Resposta inválida do serviço web' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Atualiza o notebook com os dados gerados
    const { error: notebookError } = await adminSupabaseClient
      .from('notebooks')
      .update({
        title: output.title,
        description: output.summary || null,
        icon: output.notebook_icon || '📝',
        color: output.background_color || 'bg-gray-100',
        example_questions: output.example_questions || [],
        generation_status: 'completed'
      })
      .eq('id', notebookId);

    if (notebookError) {
      console.error('Erro ao atualizar o notebook:', notebookError);
      return new Response(JSON.stringify({ error: 'Falha ao atualizar o notebook' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, ...output }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro na função generate-notebook-content:', error.message);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
