import { corsHeaders } from '../_shared/cors.ts';

// Função auxiliar para obter o ID do bucket
async function getBucketId(apiUrl: string, authToken: string, bucketName: string, accountId: string) {
    const response = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
        method: 'POST',
        headers: { 'Authorization': authToken },
        body: JSON.stringify({ accountId: accountId }),
    });
    if (!response.ok) throw new Error('Não foi possível listar os buckets.');
    const data = await response.json();
    const bucket = data.buckets.find((b: any) => b.bucketName === bucketName);
    if (!bucket) throw new Error(`Bucket com nome '${bucketName}' não encontrado.`);
    return bucket.bucketId;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const BUCKET_NAME = Deno.env.get('BACKBLAZE_BUCKET_NAME');
    const B2_KEY_ID = Deno.env.get('BACKBLAZE_KEY_ID');
    const B2_APPLICATION_KEY = Deno.env.get('BACKBLAZE_APPLICATION_KEY');

    if (!BUCKET_NAME || !B2_KEY_ID || !B2_APPLICATION_KEY) {
      throw new Error("Segredos do Backblaze não configurados.");
    }

    // 1. Autorizar a conta
    const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { 'Authorization': 'Basic ' + btoa(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`) },
    });
    if (!authResponse.ok) throw new Error('Falha na autorização com o Backblaze.');
    const authData = await authResponse.json();
    const { apiUrl, authorizationToken, accountId } = authData;

    // 2. Obter a URL de upload
    const bucketId = await getBucketId(apiUrl, authorizationToken, BUCKET_NAME, accountId);
    const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: { 'Authorization': authorizationToken },
      body: JSON.stringify({ bucketId: bucketId }),
    });
    if (!uploadUrlResponse.ok) throw new Error('Falha ao obter URL de upload.');
    const uploadUrlData = await uploadUrlResponse.json();

    // Retorna os dados necessários para o frontend fazer o upload
    return new Response(JSON.stringify(uploadUrlData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("ERRO NA FUNÇÃO:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});