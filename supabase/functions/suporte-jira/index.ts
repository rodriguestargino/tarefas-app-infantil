// ─── Supabase Edge Function: suporte-jira ────────────────────────────────────
// Cria um ticket no Jira Service Management a partir do formulário de suporte do app.
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

/** Monta a description do ticket usando Jira Wiki Markup (String format) */
function buildDescriptionText(
  emailCliente: string,
  tipoDuvida: string,
  descricao: string,
  diagnostico: string,
): string {
  return `h3. 📧 Informações do Contato
*E-mail:* ${emailCliente}
*Tipo de Solicitação:* ${tipoDuvida}

----

h3. 💬 Mensagem do Usuário
${descricao}

----

h3. 🔧 Informações de Diagnóstico
{code}
${diagnostico}
{code}`;
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

    // ── 4. Montagem do payload Jira Service Management (JSM) ─────────────────

    const jiraPayload = {
      // Confirmado diretamente no seu Jira: O ID do Service Desk do projeto "Support" (SUP) é 1.
      serviceDeskId: '1',
      // ID do Request Type 'Get IT help' retirado da URL da sua print:
      requestTypeId: '1',
      requestFieldValues: {
        summary: `[Suporte App] ${tipoDuvida} — ${nome}`,
        description: buildDescriptionText(
          emailCliente,
          tipoDuvida,
          descricao,
          diagnostico || 'Diagnóstico não disponível',
        ),
      },
      // Cadastra automaticamente o usuário como Cliente no Jira
      raiseOnBehalfOf: emailCliente,
    }

    // ── 5. Disparo para a API do Jira Service Management ────────────────────

    const jiraResponse = await fetch(`https://${jiraDomain}/rest/servicedeskapi/request`, {
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
        { error: `Erro ao criar ticket no Jira Service Management (${jiraResponse.status}).`, details: jiraError },
        jiraResponse.status,
      )
    }

    const jiraData = await jiraResponse.json()

    return jsonResponse(
      {
        success: true,
        message: 'Ticket criado com sucesso!',
        ticketKey: jiraData.issueKey || jiraData.key || null,   // Ex: "SUP-42"
        ticketId: jiraData.issueId || jiraData.id || null,
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