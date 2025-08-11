export function asRow<T>(v: unknown): T | null {
  if (!v) return null as T | null
  // Envelopes comuns: { data: ... } ou { data: [...] }
  if (typeof v === "object" && v !== null && "data" in (v as any)) {
    const d = (v as any).data
    if (Array.isArray(d)) return (d[0] ?? null) as T | null
    if (d && typeof d === "object") return d as T
  }
  // Array direto
  if (Array.isArray(v)) {
    return (v[0] ?? null) as T | null
  }
  // Objeto direto
  if (typeof v === "object" && v !== null) return v as T
  return null as T | null
}
