import type { Publicacao, Plataforma, Formato } from "./types"

function normalizeStr(v?: unknown): string {
  return String(v ?? "").trim()
}
function normalizeKey(v?: unknown): string {
  return normalizeStr(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
}

// Trata "null"/"undefined" como vazio
function normalizePath(v: unknown): string | null {
  console.log("normalizePath - input:", v, "type:", typeof v)

  const s = String(v ?? "").trim()
  console.log("normalizePath - string:", s)

  if (!s) {
    console.log("normalizePath - empty string, returning null")
    return null
  }

  const low = s.toLowerCase()
  if (low === "null" || low === "undefined") {
    console.log("normalizePath - found literal null/undefined string, returning null")
    return null
  }

  console.log("normalizePath - returning:", s)
  return s
}

function parseArrayOrJSON(v: unknown): string[] {
  if (Array.isArray(v)) return v as any
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function parseComentarios(v: unknown): { autor: string; texto: string; created_at: string }[] {
  if (Array.isArray(v)) return v as any

  if (typeof v === "string" && v.trim()) {
    // Tenta fazer parse como JSON primeiro
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      // Se não for JSON válido, trata como string simples
      return [
        {
          autor: "Cliente",
          texto: v.trim(),
          created_at: new Date().toISOString(),
        },
      ]
    }
  }

  return []
}

function parseComentariosMidias(v: unknown): { midia_index: number; comentario: string }[] {
  if (Array.isArray(v)) return v as any

  if (typeof v === "string" && v.trim()) {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function mapInboundPublicationStatus(raw: unknown, fallback: Publicacao["status"]): Publicacao["status"] {
  const s = normalizeKey(raw)
  if (!s) return fallback
  switch (s) {
    case "em_design":
      return "em_design"
    case "revisao":
    case "em_revisao":
      return "revisao"
    case "publicacao_em_aprovacao":
    case "em_aprovacao":
    case "aguardando_aprovacao":
      return "publicacao_em_aprovacao"
    case "publicacao_em_alteracao":
    case "em_alteracao":
    case "nao_aprovada":
    case "reprovada":
      return "publicacao_em_alteracao"
    case "aprovado":
    case "aprovada":
      return "aprovado"
    case "agendada":
      return "agendada"
    case "publicada":
    case "publicado":
      return "publicada"
    default:
      return fallback
  }
}

export function normalizePublication(input: any, fallbackStatus: Publicacao["status"] = "em_design"): Publicacao {
  console.log("normalizePublication - input:", {
    id: input?.id,
    midia_url: input?.midia_url,
    midia_urls: input?.midia_urls,
    midia_url1: input?.midia_url1,
    midia_url2: input?.midia_url2,
  })

  const id = String(input?.id ?? input?.pub_id ?? `pub_${Math.random().toString(36).slice(2)}`)
  const cliente_id = String(input?.cliente_id ?? input?.clienteId ?? "")
  const ideia_id = input?.ideia_id ?? input?.ideiaId ?? null
  const titulo = String(input?.titulo ?? input?.title ?? "")
  const plataforma: Plataforma = (input?.plataforma as Plataforma) ?? (input?.platform as Plataforma) ?? "Instagram"
  const formato: Formato = (input?.formato as Formato) ?? (input?.format as Formato) ?? "Reels"
  const legenda = input?.legenda ?? input?.caption ?? ""

  const primary = normalizePath(input?.midia_url ?? input?.midiaUrl ?? input?.media_url ?? input?.mediaUrl ?? null)
  console.log("normalizePublication - primary:", primary)

  const fromArray = parseArrayOrJSON(
    input?.midia_urls ?? input?.midiaUrls ?? input?.media_urls ?? input?.mediaUrls ?? null,
  )
    .map(normalizePath)
    .filter(Boolean) as string[]
  console.log("normalizePublication - fromArray:", fromArray)

  const sequentials: string[] = []
  for (let i = 1; i <= 10; i++) {
    const fieldName = `midia_url${i}`
    const rawValue = input?.[fieldName]
    console.log(`normalizePublication - ${fieldName}:`, rawValue, "type:", typeof rawValue)

    const val = normalizePath(rawValue)
    console.log(`normalizePublication - ${fieldName} normalized:`, val)

    if (val) {
      sequentials.push(val)
      console.log(`normalizePublication - added ${fieldName} to sequentials:`, val)
    }
  }
  console.log("normalizePublication - sequentials final:", sequentials)

  const list = [primary, ...sequentials, ...fromArray].filter(Boolean) as string[]
  const seen = new Set<string>()
  const midia_urls = list.filter((p) => {
    if (seen.has(p)) return false
    seen.add(p)
    return true
  })

  console.log("normalizePublication - final midia_urls:", midia_urls)

  const cover_url = normalizePath(input?.cover_url ?? input?.coverUrl ?? null)
  const status = mapInboundPublicationStatus(input?.status, fallbackStatus)

  const data_agendada = input?.data_agendada ?? input?.dataAgendada ?? input?.scheduled_at ?? input?.scheduledAt ?? null
  const data_postagem = input?.data_postagem ?? input?.dataPostagem ?? input?.posted_at ?? input?.postedAt ?? null
  const link_publicado =
    input?.link_publicado ?? input?.linkPublicado ?? input?.published_url ?? input?.publishedUrl ?? null

  const comentarios = parseComentarios(input?.comentarios)
  const comentarios_midias = parseComentariosMidias(input?.comentarios_midias)
  const created_at = String(input?.created_at ?? input?.createdAt ?? new Date().toISOString())

  const nota = input?.nota ? Number(input.nota) : null

  const atualizacao = input?.atualizacao ?? null
  const prioridade = input?.prioridade ?? null

  return {
    id,
    cliente_id,
    ideia_id: ideia_id ? String(ideia_id) : null,
    titulo,
    plataforma,
    formato,
    legenda: legenda ?? "",
    midia_url: midia_urls[0] ?? null,
    midia_urls,
    cover_url: cover_url ?? null,
    status,
    data_agendada: data_agendada ?? null,
    data_postagem: data_postagem ?? null,
    link_publicado: link_publicado ?? null,
    comentarios,
    comentarios_midias,
    created_at,
    nota,
    atualizacao,
    prioridade,
  }
}
