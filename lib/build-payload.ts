import type { Ideia, Publicacao } from "@/lib/types"
import { IDEA_STATUS } from "@/lib/status"
import { format } from "date-fns"

function normPath(v: unknown): string | null {
  const s = String(v ?? "").trim()
  if (!s) return null
  const low = s.toLowerCase()
  if (low === "null" || low === "undefined") return null
  return s
}

function formatDateTimeLocal(dateValue: string | Date | null): string | null {
  if (!dateValue) return null
  try {
    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue
    if (isNaN(date.getTime())) return null
    return format(date, "yyyy-MM-dd HH:mm:ss")
  } catch {
    return null
  }
}

// Payload completo para atualizar Ideia (inclui camelCase e underscores)
export function buildIdeaUpdatePayload(idea: Ideia, extra?: { comentario?: string; status?: Ideia["status"] }) {
  const nowFormatted = format(new Date(), "yyyy-MM-dd HH:mm:ss")
  const nextStatus = extra?.status ?? idea.status

  const dataAprovacaoFormatted =
    nextStatus === IDEA_STATUS.EM_DESIGN
      ? idea.data_aprovacao
        ? formatDateTimeLocal(new Date(`${idea.data_aprovacao}T00:00:00`))
        : nowFormatted
      : idea.data_aprovacao
        ? formatDateTimeLocal(new Date(`${idea.data_aprovacao}T00:00:00`))
        : null

  const dataPostagemFormatted = idea.data_publicacao_completa
    ? formatDateTimeLocal(idea.data_publicacao_completa)
    : idea.data_publicacao
      ? formatDateTimeLocal(new Date(`${idea.data_publicacao}T00:00:00`))
      : null

  return {
    id: idea.id,
    cliente_id: idea.cliente_id,
    cliente_nome: idea.cliente_nome ?? null,
    titulo: idea.titulo,
    plataforma: idea.plataforma,
    formato: idea.formato,
    ideia: idea.ideia,
    objetivo: idea.objetivo ?? "",
    cta: idea.cta ?? "",
    roteiro: idea.roteiro ?? "",
    legenda: idea.legenda ?? "",
    hashtags: idea.hashtags ?? "",
    referencia: idea.referencia ?? "",
    status: nextStatus,
    needs_reapproval: !!idea.needs_reapproval,
    comentarios: idea.comentarios ?? [],
    created_at: idea.created_at,
    data_aprovacao: idea.data_aprovacao ?? null,
    data_publicacao: idea.data_publicacao ?? null,

    dataAprovacao: dataAprovacaoFormatted,
    dataPostagem: dataPostagemFormatted,

    comentario: extra?.comentario ?? "",
  }
}

export function buildPublicationUpdatePayload(
  pub: Publicacao,
  extra?: { comentario?: string; status?: Publicacao["status"]; nota?: number; [key: string]: any },
) {
  const nowFormatted = format(new Date(), "yyyy-MM-dd HH:mm:ss")
  const nextStatus = extra?.status ?? pub.status

  const paths = (pub.midia_urls ?? []).map((p) => normPath(p)).filter(Boolean) as string[]
  const main = normPath(pub.midia_url) ?? paths[0] ?? null
  const cover = normPath(pub.cover_url)

  const midiaSequentials: Record<string, string | null> = {}
  for (let i = 1; i <= 10; i++) {
    midiaSequentials[`midia_url${i}`] = paths[i - 1] ?? null
  }

  const dataPostagemFormatted = formatDateTimeLocal(pub.data_postagem)
  const dataAgendadaFormatted = formatDateTimeLocal(pub.data_agendada)

  const basePayload = {
    id: pub.id,
    cliente_id: pub.cliente_id,
    ideia_id: pub.ideia_id ?? null,
    titulo: pub.titulo,
    plataforma: pub.plataforma,
    formato: pub.formato,
    legenda: pub.legenda ?? "",

    midia_url: main,
    midia_urls: paths,
    cover_url: cover ?? null,
    ...midiaSequentials,

    status: nextStatus,
    data_agendada: pub.data_agendada ?? null,
    data_postagem: pub.data_postagem ?? null,
    link_publicado: pub.link_publicado ?? null,
    comentarios: pub.comentarios ?? [],
    created_at: pub.created_at,

    dataAprovacao: nowFormatted,
    dataPostagem: nextStatus === "publicada" ? nowFormatted : dataPostagemFormatted,
    dataAgendada: dataAgendadaFormatted,

    comentario: extra?.comentario ?? "",
    nota: extra?.nota ?? null,
  }

  // Incluir todos os campos extras adicionais (como atualizacao)
  if (extra) {
    const { comentario, status, nota, ...otherExtras } = extra
    Object.assign(basePayload, otherExtras)
  }

  return basePayload
}

// Criação de Publicação a partir de Ideia (sem mídias; slots null)
export function buildPublicationCreateFromIdeaPayload(idea: Ideia): Record<string, any> {
  const toLocalDate = (ymd?: string | null) => (ymd ? formatDateTimeLocal(new Date(`${ymd}T00:00:00`)) : null)
  const midiaSequentials: Record<string, string | null> = {}
  for (let i = 1; i <= 10; i++) midiaSequentials[`midia_url${i}`] = null

  return {
    cliente_id: idea.cliente_id,
    cliente_nome: idea.cliente_nome ?? null,
    ideia_id: idea.id,

    titulo: idea.titulo,
    plataforma: idea.plataforma,
    formato: idea.formato,

    ideia: idea.ideia ?? "",
    roteiro: idea.roteiro ?? "",
    legenda: idea.legenda ?? "",
    objetivo: idea.objetivo ?? "",
    cta: idea.cta ?? "",
    hashtags: idea.hashtags ?? "",
    referencia: idea.referencia ?? "",

    status: "em_design",

    midia_url: null,
    midia_urls: [],
    cover_url: null,
    ...midiaSequentials,

    data_agendada: null,
    data_postagem: null,

    dataAprovacao: toLocalDate(idea.data_aprovacao),
    dataPostagem: idea.data_publicacao_completa
      ? formatDateTimeLocal(idea.data_publicacao_completa)
      : toLocalDate(idea.data_publicacao),
    dataAgendada: null,

    comentarios: [],
    created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
  }
}
