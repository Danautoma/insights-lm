// /supabase/functions/process-document/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const {
  DOCUMENT_PROCESSING_WEBHOOK_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} = Deno.env.toObject();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });
    const { data: { user } } = await userSupabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { publicUrl, documentType, notebookId } = await req.json();
    if (!publicUrl || !documentType || !notebookId) {
      return new Response(JSON.stringify({ error: 'publicUrl, documentType, and notebookId are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = {
      id_conversa: user.id,
      correlation_id: notebookId,
      whatsapp: user.email,
      tipo_documento: documentType,
      url_documento: publicUrl,
    };

    console.log("Disparando webhook para o Make.com (sem esperar):", payload);

    // ✨ MUDANÇA CRÍTICA: "Fire and Forget" ✨
    // Nós iniciamos a chamada para o webhook, mas não usamos 'await'.
    // Isso permite que nossa função responda imediatamente ao frontend.
    fetch(DOCUMENT_PROCESSING_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => {
      // Adicionamos um .catch para logar qualquer erro que aconteça
      // ao tentar *enviar* a requisição para o Make.com.
      console.error("Erro ao disparar o webhook:", err);
    });

    // Responde imediatamente ao frontend com sucesso.
    return new Response(JSON.stringify({ success: true, message: 'Processamento do documento iniciado.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro na função process-document:', error.message);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})

