import type { Ideia } from "./types"
import { normalizeIdea } from "./map-idea"

// Accepts multiple possible webhook shapes and returns a normalized Ideia[]
export function normalizeIdeasList(input: unknown): Ideia[] {
  if (!input) return []

  // If wrapped in { data: ... }
  if (isObject(input) && "data" in input) {
    const d = (input as any).data
    return normalizeIdeasList(d)
  }

  // If array like: [{ ideias: [...] }] or direct array of ideias/objects
  if (Array.isArray(input)) {
    // Case: array with a single object that has { ideias: [...] }
    // or an array of such objects -> flatten
    const collected: any[] = []
    for (const item of input) {
      if (isObject(item) && Array.isArray((item as any).ideias)) {
        collected.push(...((item as any).ideias as any[]))
      } else {
        collected.push(item)
      }
    }
    return collected.map((x) => normalizeIdea(x))
  }

  // If object with ideias property
  if (isObject(input) && Array.isArray((input as any).ideias)) {
    return ((input as any).ideias as any[]).map((x) => normalizeIdea(x))
  }

  // Single object fallback
  if (isObject(input)) {
    return [normalizeIdea(input)]
  }

  return []
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}
