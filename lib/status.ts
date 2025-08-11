export const IDEA_STATUS = {
  RASCUNHO: "rascunho",
  CRIADA: "ideia_criada",
  EM_APROVACAO: "ideia_em_aprovacao",
  EM_ALTERACAO: "ideia_em_alteracao",
  EM_DESIGN: "em_design",
  APROVADA: "aprovada",
  REPROVADA: "reprovada",
} as const

export type IdeaStatusKey = (typeof IDEA_STATUS)[keyof typeof IDEA_STATUS]

export function isIdeaPendingForClient(status?: string | null) {
  const s = String(status ?? "").toLowerCase()
  return s === IDEA_STATUS.EM_APROVACAO || s === IDEA_STATUS.EM_ALTERACAO || s === IDEA_STATUS.CRIADA
}

export function nextIdeaStatusOnClientApprove(_current?: string | null) {
  return IDEA_STATUS.EM_DESIGN
}
export function nextIdeaStatusOnClientReject(_current?: string | null) {
  return IDEA_STATUS.EM_ALTERACAO
}

export const PUB_STATUS = {
  EM_APROVACAO: "publicacao_em_aprovacao",
  EM_ALTERACAO: "publicacao_em_alteracao",
  APROVADO: "aprovado",
  AGENDADA: "agendada",
  PUBLICADA: "publicada",
} as const

export type PubStatusKey = (typeof PUB_STATUS)[keyof typeof PUB_STATUS]

export function nextPubStatusOnApprove(_current?: string | null) {
  return PUB_STATUS.APROVADO
}
export function nextPubStatusOnReject(_current?: string | null) {
  return PUB_STATUS.EM_ALTERACAO
}
