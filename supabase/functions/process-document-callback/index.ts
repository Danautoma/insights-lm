import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { notebookId, documentType, status } = await req.json()

    if (!notebookId || !documentType || !status) {
      throw new Error('notebookId, documentType, e status são obrigatórios.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // PASSO 1: Atualiza o status do DOCUMENTO (tabela sources)
    const { error: sourceError } = await supabaseAdmin
      .from('sources')
      .update({
        processing_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('notebook_id', notebookId)
      .eq('document_type', documentType)

    if (sourceError) {
      throw sourceError
    }

    // --- PASSO 2: ATUALIZA O STATUS DO DOSSIÊ (tabela notebooks) - NOVO! ---
    const { error: notebookError } = await supabaseAdmin
      .from('notebooks')
      .update({ generation_status: status }) // Usa a coluna correta da tabela notebooks
      .eq('id', notebookId)

    if (notebookError) {
      throw notebookError
    }

    return new Response(JSON.stringify({ message: 'Status do documento e do dossiê atualizados com sucesso!' }), {
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
