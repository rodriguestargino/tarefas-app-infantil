// ─── Supabase Edge Function: enviar-email ────────────────────────────────────
// Envia emails transacionais via Resend API.
// Secret necessário: RESEND_API_KEY (configurar via `supabase secrets set`)

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido. Use POST.' }, 405)
  }

  try {
    const { to, subject, html, replyTo } = await req.json()

    if (!to || !subject || !html) {
      return jsonResponse(
        { error: 'Campos obrigatórios: to, subject, html.' },
        400,
      )
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.error('❌ RESEND_API_KEY não configurado.')
      return jsonResponse({ error: 'Configuração do servidor incompleta.' }, 500)
    }

    const resendPayload: Record<string, unknown> = {
      from: 'Suporte App Tarefas <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }

    if (replyTo) {
      resendPayload.reply_to = replyTo
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`❌ Resend API Error [${response.status}]:`, errorBody)
      return jsonResponse(
        { error: `Erro ao enviar email (${response.status}).`, details: errorBody },
        response.status,
      )
    }

    const data = await response.json()
    return jsonResponse({ success: true, emailId: data.id }, 200)

  } catch (error) {
    console.error('❌ Erro inesperado:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro interno.' },
      500,
    )
  }
})
