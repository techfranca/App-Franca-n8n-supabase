import type { Publicacao } from "./types"
import { normalizePublication } from "./map-publication"

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

export function normalizePublicationsList(input: unknown): Publicacao[] {
  if (!input) return []

  // Envelopes com { data: ... }
  if (isObject(input) && "data" in input) {
    return normalizePublicationsList((input as any).data)
  }

  // Caso: array com objetos que podem conter { ideias: [...] } (forma atual do webhook)
  if (Array.isArray(input)) {
    const collected: any[] = []
    for (const item of input) {
      if (isObject(item) && Array.isArray((item as any).ideias)) {
        collected.push(...((item as any).ideias as any[]))
      } else {
        collected.push(item)
      }
    }
    return collected.map((x) => normalizePublication(x))
  }

  // Caso: objeto único com { ideias: [...] }
  if (isObject(input) && Array.isArray((input as any).ideias)) {
    return ((input as any).ideias as any[]).map((x) => normalizePublication(x))
  }

  // Envelopes comuns { publicacoes: [...] } | { publications: [...] } | { rows|items|list: [...] }
  if (isObject(input)) {
    const keys = ["publicacoes", "publications", "rows", "items", "list"]
    for (const k of keys) {
      const v = (input as any)[k]
      if (Array.isArray(v)) return v.map((x) => normalizePublication(x))
    }
  }

  // Objeto único
  if (isObject(input)) {
    return [normalizePublication(input)]
  }

  return []
}
