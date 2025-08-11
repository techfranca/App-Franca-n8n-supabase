import type { NextRequest } from "next/server"

const DEFAULT_WEBHOOK_URL = "https://webhooks.francaassessoria.com/webhook/N8N_WEBHOOK"

// Mock DB em memória
const mockDB = {
  ideias: [] as any[],
  publicacoes: [] as any[],
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      resource?: string
      action?: string
      payload?: unknown
    } | null

    if (!body || !body.resource || !body.action) {
      return new Response(JSON.stringify({ ok: false, error: "Parâmetros inválidos." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const resource = body.resource
    const action = body.action
    const targetUrl = process.env.N8N_WEBHOOK_URL || DEFAULT_WEBHOOK_URL
    const token = process.env.N8N_TOKEN

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`

    try {
      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ resource, action, payload: body.payload ?? null }),
      })
      let data: unknown = null
      try {
        data = await upstream.json()
      } catch {
        try {
          data = await upstream.text()
        } catch {
          data = null
        }
      }
      if (!upstream.ok) {
        const message =
          (data && typeof data === "object" && "error" in (data as any) && String((data as any).error)) ||
          upstream.statusText ||
          "Erro ao contatar n8n"
        return new Response(JSON.stringify({ ok: false, error: message }), {
          status: upstream.status || 502,
          headers: { "content-type": "application/json", "x-bridge-mode": "upstream-error", "x-bridge-url": targetUrl },
        })
      }
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { "content-type": "application/json", "x-bridge-mode": "upstream", "x-bridge-url": targetUrl },
      })
    } catch {
      const data = mockBridge(resource, action, body.payload)
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { "content-type": "application/json", "x-bridge-mode": "mock-fallback", "x-bridge-url": targetUrl },
      })
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "Erro inesperado" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }
}

function mockBridge(resource: string, action: string, payload: any): unknown {
  const nowISO = new Date().toISOString()

  const ensureSeedIdeias = () => {
    if (mockDB.ideias.length === 0) {
      mockDB.ideias.push(
        {
          id: "id_mock_1",
          cliente_id: "cli_3haus",
          titulo: "Reels bastidores 3haus",
          plataforma: "Instagram",
          formato: "Reels",
          ideia: "Bastidores da obra",
          roteiro: "Cenas curtas",
          legenda: "Acompanhe nossos bastidores na 3haus!",
          status: "ideia_em_aprovacao",
          comentarios: [],
          created_at: nowISO,
        },
        {
          id: "id_mock_2",
          cliente_id: "cli_auramar",
          titulo: "Carrossel dicas",
          plataforma: "Facebook",
          formato: "Carrossel",
          ideia: "Dicas semanais",
          legenda: "Dica da semana!",
          status: "aprovada",
          comentarios: [],
          created_at: nowISO,
        },
      )
    }
  }

  if (resource === "ideias") {
    ensureSeedIdeias()

    if (action === "list") {
      const cid = payload?.clienteId ?? null
      return cid ? mockDB.ideias.filter((x) => x.cliente_id === cid) : mockDB.ideias
    }
    if (action === "create") {
      const computedStatus = payload?.status ?? (payload?.dataAprovacao ? "aprovada" : "ideia_em_aprovacao")
      const row = {
        ...(payload || {}),
        id: `id_${Math.random().toString(36).slice(2)}`,
        comentarios: [],
        created_at: nowISO,
        status: computedStatus,
      }
      mockDB.ideias.unshift(row)
      return row
    }
    if (action === "update") {
      const idx = mockDB.ideias.findIndex((x) => x.id === payload?.id)
      const next = {
        ...(mockDB.ideias[idx] || {}),
        ...(payload || {}),
        status:
          payload?.status ?? (payload?.dataAprovacao ? "aprovada" : mockDB.ideias[idx]?.status || "ideia_em_aprovacao"),
        updated_at: nowISO,
      }
      if (idx >= 0) mockDB.ideias[idx] = next
      else mockDB.ideias.unshift(next)
      return next
    }
    if (action === "update_aprovado") {
      const idx = mockDB.ideias.findIndex((x) => x.id === payload?.id)
      if (idx >= 0) {
        const comment = payload?.comentario ? String(payload.comentario) : ""
        const next = {
          ...mockDB.ideias[idx],
          ...payload,
          status: "em_design",
          data_aprovacao: nowISO.slice(0, 10),
          updated_at: nowISO,
          comentarios: [
            ...(mockDB.ideias[idx].comentarios ?? []),
            ...(comment ? [{ autor: "Cliente", texto: comment, created_at: nowISO }] : []),
          ],
        }
        mockDB.ideias[idx] = next
        return next
      }
      return { ok: false, error: "ID não encontrado" }
    }
    if (action === "update_reprovado") {
      const idx = mockDB.ideias.findIndex((x) => x.id === payload?.id)
      if (idx >= 0) {
        const comment = payload?.comentario ? String(payload.comentario) : ""
        const next = {
          ...mockDB.ideias[idx],
          ...payload,
          status: "ideia_em_alteracao",
          updated_at: nowISO,
          comentarios: [
            ...(mockDB.ideias[idx].comentarios ?? []),
            ...(comment ? [{ autor: "Cliente", texto: comment, created_at: nowISO }] : []),
          ],
        }
        mockDB.ideias[idx] = next
        return next
      }
      return { ok: false, error: "ID não encontrado" }
    }
    if (action === "approve") {
      const idx = mockDB.ideias.findIndex((x) => x.id === payload?.id)
      if (idx >= 0) {
        const comment = payload?.comentario ? String(payload.comentario) : ""
        const next = {
          ...mockDB.ideias[idx],
          status: "em_design",
          data_aprovacao: nowISO.slice(0, 10),
          updated_at: nowISO,
          comentarios: [
            ...(mockDB.ideias[idx].comentarios ?? []),
            ...(comment ? [{ autor: "Cliente", texto: comment, created_at: nowISO }] : []),
          ],
        }
        mockDB.ideias[idx] = next
        return next
      }
      return { ok: false, error: "ID não encontrado" }
    }
    if (action === "reject") {
      const idx = mockDB.ideias.findIndex((x) => x.id === payload?.id)
      if (idx >= 0) {
        const comment = payload?.comentario ? String(payload.comentario) : ""
        const next = {
          ...mockDB.ideias[idx],
          status: "reprovada",
          updated_at: nowISO,
          comentarios: [
            ...(mockDB.ideias[idx].comentarios ?? []),
            ...(comment ? [{ autor: "Cliente", texto: comment, created_at: nowISO }] : []),
          ],
        }
        mockDB.ideias[idx] = next
        return next
      }
      return { ok: false, error: "ID não encontrado" }
    }
    if (action === "delete") {
      const id = payload?.id
      const before = mockDB.ideias.length
      mockDB.ideias = mockDB.ideias.filter((x) => x.id !== id)
      return { ok: true, id, deleted: before !== mockDB.ideias.length }
    }
  }

  if (resource === "publicacoes") {
    if (action === "list") {
      const cid = payload?.clienteId ?? null
      const arr = cid ? mockDB.publicacoes.filter((x) => x.cliente_id === cid) : mockDB.publicacoes
      return arr
    }
    if (action === "create_from_idea" || action === "create") {
      const row = {
        ...(payload || {}),
        id: `pub_${Math.random().toString(36).slice(2)}`,
        created_at: nowISO,
        comentarios: [],
      }
      mockDB.publicacoes.unshift(row)
      return row
    }
    if (action === "update" || action === "approve" || action === "schedule" || action === "publish") {
      const idx = mockDB.publicacoes.findIndex((x) => x.id === payload?.id)
      const prev = idx >= 0 ? mockDB.publicacoes[idx] : {}
      const comentario = payload?.comentario ? String(payload.comentario) : ""
      const next = {
        ...(prev || {}),
        ...(payload || {}),
        updated_at: nowISO,
        comentarios: [
          ...((prev as any)?.comentarios ?? []),
          ...(comentario ? [{ autor: "Cliente", texto: comentario, created_at: nowISO }] : []),
        ],
      }
      if (idx >= 0) mockDB.publicacoes[idx] = next
      else mockDB.publicacoes.unshift(next)
      return next
    }
    if (action === "delete") {
      const id = payload?.id
      const before = mockDB.publicacoes.length
      mockDB.publicacoes = mockDB.publicacoes.filter((x) => x.id !== id)
      return { ok: true, id, deleted: before !== mockDB.publicacoes.length }
    }
  }

  if (resource === "social_resumo" && action === "get") {
    return {
      totalIdeias: mockDB.ideias.length,
      aguardandoAprovacao: mockDB.ideias.filter((i) => i.status === "ideia_em_aprovacao").length,
      publicacoesNoMes: mockDB.publicacoes.length,
      emProducao: mockDB.ideias.filter((i) => i.status === "em_design").length,
      clientesAtivosNoMes: 3,
      statusIdeias: {
        ideia_em_aprovacao: mockDB.ideias.filter((i) => i.status === "ideia_em_aprovacao").length,
        em_design: mockDB.ideias.filter((i) => i.status === "em_design").length,
        aprovada: mockDB.ideias.filter((i) => i.status === "aprovada").length,
      },
      statusPublicacoes: {
        publicacao_em_aprovacao: mockDB.publicacoes.filter((p) => p.status === "publicacao_em_aprovacao").length,
        agendada: mockDB.publicacoes.filter((p) => p.status === "agendada").length,
        publicada: mockDB.publicacoes.filter((p) => p.status === "publicada").length,
      },
      atividadeRecente: mockDB.ideias.slice(0, 5).map((i) => ({
        tipo: "criou ideia",
        autor: "Sistema",
        quando: i.created_at,
        label: i.titulo,
        href: "/social/ideias",
      })),
    }
  }

  return { mocked: true, echo: { resource, action, payload } }
}
