import type { Ideia, IdeiaStatus, Plataforma, Formato } from "./types"

// Converte string de data ISO/Date para "YYYY-MM-DD"
function toYMD(isoOrDate?: string | Date | null): string | null {
  if (!isoOrDate) return null
  try {
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

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

// Mapeia status vindos do n8n (textos/variações) para nossos valores estáveis
function mapInboundIdeaStatus(raw: unknown, fallback: IdeiaStatus): IdeiaStatus {
  const s = normalizeKey(raw)
  if (!s) return fallback

  switch (s) {
    case "rascunho":
      return "rascunho"
    case "ideia_em_aprovacao":
    case "ideia_aprovacao":
    case "em_aprovacao":
    case "aguardando_aprovacao":
    case "aguardando_cliente":
    case "ideia_criada":
    case "criada":
      return "ideia_em_aprovacao"
    case "ideia_em_alteracao":
    case "em_alteracao":
    case "nao_aprovada":
      return "ideia_em_alteracao"
    case "reprovada":
    case "reprovado":
      return "reprovada"
    case "em_design":
    case "aprovada":
    case "aprovado":
      return "em_design"
    default:
      return fallback
  }
}

// Normaliza uma linha retornada pelo n8n/Supabase para o formato Ideia usado na UI
export function normalizeIdea(input: any, fallbackStatus: IdeiaStatus = "rascunho"): Ideia {
  const id = String(input?.id ?? `id_${Math.random().toString(36).slice(2)}`)
  const cliente_id = String(
    input?.cliente_id ?? input?.clienteId ?? input?.cliente ?? input?.client_id ?? input?.clientId ?? "",
  )
  const cliente_nome = input?.cliente_nome ?? input?.clienteNome ?? undefined

  const titulo = String(input?.titulo ?? "")
  const referencia = input?.referencia ?? undefined

  const plataforma: Plataforma = (input?.plataforma as Plataforma) ?? (input?.platform as Plataforma) ?? "Instagram"

  const formato: Formato = (input?.formato as Formato) ?? (input?.format as Formato) ?? "Reels"

  const ideia = input?.ideia == null ? "" : String(input?.ideia)
  const objetivo = input?.objetivo ?? undefined
  const cta = input?.cta ?? undefined
  const roteiro = input?.roteiro ?? undefined
  const legenda = input?.legenda ?? undefined
  const hashtags = input?.hashtags ?? undefined

  // Datas: múltiplas chaves possíveis (com e sem underscore e minúsculas)
  const data_aprovacao = toYMD(
    input?.data_aprovacao ?? input?.dataAprovacao ?? input?.dataaprovacao ?? input?.data_aprovaçao ?? null,
  )
  const data_publicacao = toYMD(
    input?.data_publicacao ??
      input?.dataPostagem ??
      input?.datapostagem ??
      input?.dataPublicacao ??
      input?.data_publicacao_prevista ??
      null,
  )

  // Status
  const status: IdeiaStatus = mapInboundIdeaStatus(input?.status, fallbackStatus)

  const created_at = String(input?.created_at ?? new Date().toISOString())

  // Comentários:
  // - Preferimos array "comentarios"
  // - Se vier apenas "comentario" (string), transformamos em array com 1 item
  let comentarios: { autor: string; texto: string; created_at: string }[] = []
  if (Array.isArray(input?.comentarios)) {
    comentarios = input.comentarios
  } else if (typeof input?.comentario === "string" && input.comentario.trim()) {
    comentarios = [{ autor: "Cliente", texto: String(input.comentario), created_at: new Date().toISOString() }]
  }

  return {
    id,
    cliente_id,
    cliente_nome,
    titulo,
    referencia,
    plataforma,
    hashtags,
    formato,
    ideia,
    objetivo,
    cta,
    roteiro,
    legenda,
    data_aprovacao,
    data_publicacao,
    status,
    needs_reapproval: Boolean(input?.needs_reapproval ?? false),
    comentarios,
    created_at,
  }
}
