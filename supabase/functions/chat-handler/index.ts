import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

console.log("Chat handler function started")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { notebook_id, message } = await req.json()

    console.log('Chat handler received:', { notebook_id, message })

    // Validate required fields
    if (!notebook_id || !message) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: notebook_id and message are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Forward request to n8n webhook
    const n8nWebhookUrl = 'https://webhooks.arrematanteai.com/webhook/2fabf43f-6e6e-424b-8e93-9150e9ce7d6c'
    
    console.log('Forwarding to n8n webhook:', n8nWebhookUrl)

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notebook_id,
        message
      })
    })

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('N8n webhook error:', {
        status: n8nResponse.status,
        statusText: n8nResponse.statusText,
        errorText
      })
      
      return new Response(
        JSON.stringify({ 
          error: `N8n webhook error: ${n8nResponse.status} ${n8nResponse.statusText}`,
          details: errorText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get response from n8n
    const responseText = await n8nResponse.text()
    console.log('N8n response:', responseText)

    // Return the response from n8n
    return new Response(
      responseText,
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      }
    )

  } catch (error) {
    console.error('Chat handler error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
