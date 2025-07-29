// /supabase/functions/generate-upload-url/index.ts

// --- Usando importações nativas do Deno e o especificador 'npm:' ---
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// MUDANÇA CRÍTICA: Importando o SDK da AWS diretamente do npm.
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.567.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.567.0';
import { nanoid } from 'https://esm.sh/nanoid@4.0.0';

// --- Cabeçalhos CORS para serem reutilizados ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Para produção, troque por 'http://localhost:8080, https://seu-dominio.com'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Verificação dos segredos (executada apenas uma vez quando a função inicia) ---
const {
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ENDPOINT,
  R2_PUBLIC_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} = Deno.env.toObject();

if (!R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_PUBLIC_URL || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("ERRO CRÍTICO: Uma ou mais variáveis de ambiente não foram definidas.");
  // A função não irá iniciar corretamente se isso acontecer.
}

// --- Cliente S3 (com a correção para evitar 'fs.readFile') ---
const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  // Esta linha é uma tentativa adicional de desabilitar a busca por arquivos de configuração.
  configFileSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // SHA256 de um arquivo vazio
});

serve(async (req: Request) => {
  // 1. Responde imediatamente à requisição de pre-voo (preflight) do CORS.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Autenticação do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 3. Lógica principal
    const { filename, contentType } = await req.json();
    if (!filename || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing filename or contentType' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const fileKey = `${user.id}/${nanoid()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return new Response(JSON.stringify({ url: signedUrl, fileUrl: `${R2_PUBLIC_URL}/${fileKey}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro inesperado na função:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
