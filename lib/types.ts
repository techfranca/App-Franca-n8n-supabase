export type Plataforma = "Instagram" | "Facebook" | "TikTok" | "YouTube" | "LinkedIn"
export type Formato = "Reels" | "Carrossel" | "Imagem única" | "Stories" | "Outro"

export type IdeiaStatus =
  | "rascunho"
  | "ideia_criada"
  | "ideia_em_aprovacao"
  | "ideia_em_alteracao"
  | "em_design"
  | "aprovada"
  | "reprovada"

export type PublicacaoStatus =
  | "em_design"
  | "publicacao_em_aprovacao"
  | "publicacao_em_alteracao"
  | "aprovado"
  | "agendada"
  | "publicada"

export interface Cliente {
  id: string
  nome: string
  grupo?: string | null
}

export interface Contato {
  id: string
  cliente_id: string
  nome: string
  email: string
  whatsapp?: string
}

export interface Ideia {
  id: string
  cliente_id: string
  cliente_nome?: string
  titulo: string
  referencia?: string
  plataforma: Plataforma
  hashtags?: string
  formato: Formato
  ideia: string
  objetivo?: string
  cta?: string
  roteiro?: string
  legenda?: string
  data_aprovacao?: string | null // YYYY-MM-DD
  data_publicacao?: string | null // YYYY-MM-DD
  data_publicacao_completa?: string | null // ISO com data e hora completas
  status: IdeiaStatus
  needs_reapproval?: boolean
  comentarios?: { autor: string; texto: string; created_at: string }[]
  comentarios_artes?: { arte_index: number; comentario: string }[]
  created_at: string
}

export interface Publicacao {
  id: string
  cliente_id: string
  ideia_id?: string | null
  titulo: string
  plataforma: Plataforma
  formato: Formato
  legenda?: string
  midia_url?: string | null // Compatibilidade (primeira mídia)
  midia_urls?: string[] // NOVO: lista completa de mídias (imagens/vídeos)
  cover_url?: string | null // NOVO: capa (imagem) para vídeo/carrocel
  status: PublicacaoStatus
  data_agendada?: string | null // ISO com hora
  data_postagem?: string | null // ISO
  link_publicado?: string | null
  comentarios?: { autor: string; texto: string; created_at: string }[]
  created_at: string
}

export type UserRole = "admin" | "colaborador" | "cliente"

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  cliente_id?: string | null
}

export interface BridgeRequest<T = unknown> {
  resource: string
  action: string
  payload?: T
}

export interface BridgeResponse<T = unknown> {
  ok: boolean
  data: T | null
  error?: string
}
