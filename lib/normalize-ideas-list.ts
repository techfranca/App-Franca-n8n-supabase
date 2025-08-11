import type { Ideia, IdeiaStatus } from "./types"
import { normalizeIdea } from "./map-idea"

// Accepts multiple possible webhook shapes and returns a normalized Ideia[]
export function normalizeIdeasList(input: unknown, fallbackStatus: IdeiaStatus = "rascunho"): Ideia[] {
  if (!input) return []

  // If wrapped in { data: ... }
  if (isObject(input) && "data" in input) {
    const d = (input as any).data
    return normalizeIdeasList(d, fallbackStatus)
  }

  // If array like: [{ ideias: [...] }] or direct array of ideias/objects
  if (Array.isArray(input)) {
    const collected: any[] = []
    for (const item of input) {
      if (isObject(item) && Array.isArray((item as any).ideias)) {
        collected.push(...((item as any).ideias as any[]))
      } else {
        collected.push(item)
      }
    }
    return collected.map((x) => normalizeIdea(x, fallbackStatus))
  }

  // If object with ideias property
  if (isObject(input) && Array.isArray((input as any).ideias)) {
    return ((input as any).ideias as any[]).map((x) => normalizeIdea(x, fallbackStatus))
  }

  // Single object fallback
  if (isObject(input)) {
    return [normalizeIdea(input, fallbackStatus)]
  }

  return []
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}
