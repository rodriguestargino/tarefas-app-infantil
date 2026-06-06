// ─── Supabase Edge Function: suporte-jira ────────────────────────────────────
// Cria um ticket (Issue) no Jira Cloud a partir do formulário de suporte do app.
// Secrets necessários (configurar via `supabase secrets set`):
//   JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN

// ─── CORS Headers ────────────────────────────────────────────────────────────

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resposta JSON padronizada com CORS */
function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Monta a description do ticket no formato ADF (Atlassian Document Format) */
function buildAdfDescription(
  emailCliente: string,
  tipoDuvida: string,
  descricao: string,
  diagnostico: string,
) {
  return {
    type: 'doc',
    version: 1,
    content: [
      // ── Cabeçalho: Informações do Contato ──
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: '📧 Informações do Contato' }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'E-mail: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: emailCliente },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Tipo de Solicitação: ', marks: [{ type: 'strong' }] },
          { type: 'text', text: tipoDuvida },
        ],
      },

      // ── Separador ──
      { type: 'rule' },

      // ── Mensagem do Usuário ──
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: '💬 Mensagem do Usuário' }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: descricao }],
      },

      // ── Separador ──
      { type: 'rule' },

      // ── Dados Técnicos de Diagnóstico ──
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: '🔧 Informações de Diagnóstico' }],
      },
      {
        type: 'panel',
        attrs: { panelType: 'info' },
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: diagnostico,
                marks: [{ type: 'code' }],
              },
            ],
          },
        ],
      },
    ],
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // Preflight CORS (requisição OPTIONS enviada pelo browser/app antes do POST)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apenas POST é aceito
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido. Use POST.' }, 405)
  }

  try {
    // ── 1. Parse e validação do payload ──────────────────────────────────────

    const { nome, emailCliente, tipoDuvida, descricao, diagnostico } = await req.json()

    if (!nome || !emailCliente || !tipoDuvida || !descricao) {
      return jsonResponse(
        { error: 'Campos obrigatórios ausentes: nome, emailCliente, tipoDuvida, descricao.' },
        400,
      )
    }

    // ── 2. Leitura dos Secrets (credenciais seguras do Supabase) ─────────────

    const jiraDomain = Deno.env.get('JIRA_DOMAIN')
    const jiraEmail = Deno.env.get('JIRA_EMAIL')
    const jiraToken = Deno.env.get('JIRA_API_TOKEN')

    if (!jiraDomain || !jiraEmail || !jiraToken) {
      console.error('❌ Secrets do Jira não configurados. Execute: supabase secrets set JIRA_DOMAIN=... JIRA_EMAIL=... JIRA_API_TOKEN=...')
      return jsonResponse(
        { error: 'Configuração do servidor incompleta. Contate o desenvolvedor.' },
        500,
      )
    }

    // ── 3. Autenticação HTTP Basic (email:token → Base64) ────────────────────

    const credentials = btoa(`${jiraEmail}:${jiraToken}`)

    // ── 4. Montagem do payload Jira (ADF) ────────────────────────────────────

    const jiraPayload = {
      fields: {
        project: {
          // ⚠️ SUBSTITUA AQUI PELA KEY DO SEU PROJETO JIRA (Ex: "SUP", "RAFA", "TAR")
          key: 'SUP',
        },
        summary: `[Suporte App] ${tipoDuvida} — ${nome}`,
        description: buildAdfDescription(
          emailCliente,
          tipoDuvida,
          descricao,
          diagnostico || 'Diagnóstico não disponível',
        ),
        issuetype: {
          // Tipo de item no Jira
          name: 'Task',
        },
      },
    }

    // ── 5. Disparo para a API do Jira Cloud v3 ──────────────────────────────

    const jiraResponse = await fetch(`https://${jiraDomain}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(jiraPayload),
    })

    // ── 6. Tratamento da resposta ────────────────────────────────────────────

    if (!jiraResponse.ok) {
      let jiraError: string
      try {
        const errorBody = await jiraResponse.json()
        jiraError = JSON.stringify(errorBody.errors || errorBody.errorMessages || errorBody)
      } catch {
        jiraError = await jiraResponse.text()
      }
      console.error(`❌ Jira API Error [${jiraResponse.status}]:`, jiraError)
      return jsonResponse(
        { error: `Erro ao criar ticket no Jira (${jiraResponse.status}).`, details: jiraError },
        jiraResponse.status,
      )
    }

    const jiraData = await jiraResponse.json()

    return jsonResponse(
      {
        success: true,
        message: 'Ticket criado com sucesso!',
        ticketKey: jiraData.key || null,   // Ex: "SUP-42"
        ticketId: jiraData.id || null,
      },
      200,
    )
  } catch (error) {
    console.error('❌ Erro inesperado na Edge Function:', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor.' },
      500,
    )
  }
})