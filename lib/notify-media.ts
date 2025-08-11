import { bridge } from "@/lib/bridge"
import { buildPublicationUpdatePayload } from "@/lib/build-payload"
import type { Publicacao } from "@/lib/types"

// Dispara o webhook com todas as informações da publicação
// Use sempre que houver envio/substituição de mídia
export async function notifyMediaUpsert(pub: Publicacao, opts?: { comentario?: string }) {
  const payload = buildPublicationUpdatePayload(pub, { comentario: opts?.comentario })
  // Action padronizada no n8n: "publicacoes" / "update"
  return bridge("publicacoes", "update", payload)
}
