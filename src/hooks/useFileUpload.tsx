import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const { user } = useAuth();

  const sendToMakeWebhook = async (data: {
    id_conversa: string;
    correlation_id: string;
    whatsapp: string;
    tipo_documento: string;
    url_documento: string;
  }) => {
    try {
      console.log('Enviando para o Make.com:', data);
      
      const response = await fetch('https://hook.us2.make.com/pmron1i3v8zsp6mr5wd1t5chla7xcokx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na chamada do webhook Make.com:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log('Resposta do webhook Make.com:', responseText);
      
      // Trata o caso de sucesso - Make.com responde com 'Accepted'
      if (responseText === 'Accepted' || response.status === 200) {
        console.log('Webhook Make.com processado com sucesso');
        return { success: true, message: responseText };
      }
      
      // Se não for 'Accepted', tenta fazer parse como JSON
      try {
        const jsonResult = JSON.parse(responseText);
        return jsonResult;
      } catch (parseError) {
        console.log('Resposta não é JSON válido, retornando como texto:', responseText);
        return { success: true, message: responseText };
      }
    } catch (error) {
      console.error('Falha ao enviar dados para o webhook Make.com:', error);
      throw error;
    }
  };

  const uploadFile = async (
    file: File, 
    notebookId?: string, 
    sourceId?: string, 
    documentType?: string
  ) => {
    setUploading(true);
    setError(null);
    setFileUrl(null);

    try {
      // Pega a sessão atual do Supabase para obter o token de acesso.
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Usuário não autenticado. Faça o login novamente.");
      }

      console.log('Iniciando upload para Cloudflare R2:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      // Chamada para Edge Function com o cabeçalho de autorização.
      const res = await fetch('https://crisbuthezpbojcshrwh.supabase.co/functions/v1/generate-upload-url', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errorData.error || "Erro ao gerar URL de upload");
      }

      const { url, fileUrl: returnedFileUrl } = await res.json();
      console.log('URL de upload gerada com sucesso');

      // Upload para a URL assinada do R2
      const uploadRes = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Erro ao enviar o arquivo para o serviço de armazenamento.");
      }

      console.log('Upload para Cloudflare R2 concluído com sucesso');
      console.log('URL pública do arquivo:', returnedFileUrl);

      setFileUrl(returnedFileUrl);

      // Enviar dados para o webhook do Make.com se temos os dados necessários
      if (user && notebookId && documentType && returnedFileUrl) {
        try {
          const webhookData = {
            id_conversa: user.id,
            correlation_id: notebookId,
            whatsapp: user.email || '',
            tipo_documento: documentType,
            url_documento: returnedFileUrl
          };

          console.log('Enviando para o Make.com:', { 
            url: returnedFileUrl, 
            ...webhookData 
          });

          await sendToMakeWebhook(webhookData);
          console.log('Dados enviados com sucesso para o webhook Make.com');
        } catch (webhookError) {
          console.error('Falha ao enviar para o webhook Make.com, mas upload foi bem-sucedido:', webhookError);
          // Não falha o upload inteiro se o webhook falhar
        }
      } else {
        console.log('Webhook não enviado - dados insuficientes:', {
          hasUser: !!user,
          hasNotebookId: !!notebookId,
          hasDocumentType: !!documentType,
          hasFileUrl: !!returnedFileUrl
        });
      }

      return returnedFileUrl;

    } catch (err: any) {
      console.error("Falha no upload:", err);
      setError(err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, error, fileUrl };
}
