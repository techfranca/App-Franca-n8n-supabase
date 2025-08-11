export function toArray<T = any>(v: any): T[] {
  if (Array.isArray(v)) return v
  if (!v) return []
  if (Array.isArray((v as any).data)) return (v as any).data
  return [v]
}
