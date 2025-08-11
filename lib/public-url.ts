// Utility to convert a storage path into a public URL (e.g., Supabase Storage)
// Safe to use on the client.
//
// Behavior:
// - If path is absolute (http, https, data, blob) or site-root (/...), returns as-is
// - If path already contains "object/public/", returns as-is if absolute; otherwise, returns with leading "/"
// - If NEXT_PUBLIC_SUPABASE_URL is set, builds: {base}/storage/v1/object/public/{bucket}/{path}
//   - Default bucket is "midia" but can be overridden via options.bucket
// - If no env is available, returns the original path (so onError fallback can kick in)
export function publicUrlFromPath(
  path: string | null | undefined,
  options?: { bucket?: string; baseUrl?: string },
): string {
  if (!path) return ""

  const p = String(path).trim()
  if (p === "") return ""

  const isAbsolute = /^https?:\/\//i.test(p) || /^data:/i.test(p) || /^blob:/i.test(p) || p.startsWith("/")

  // If it's already an absolute URL or site-root, return as-is.
  if (isAbsolute) {
    return p
  }

  if (p.startsWith("api/uploads/")) {
    return `/${p}`
  }

  // If the path already includes the public storage segment, prefer returning it with a leading slash.
  if (p.includes("storage/v1/object/public/") || p.includes("object/public/")) {
    return p.startsWith("/") ? p : `/${p}`
  }

  // Try to build a Supabase public URL if env/baseUrl is available.
  const base = options?.baseUrl ?? (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined)

  const bucket = options?.bucket ?? "midia"

  if (base && /^https?:\/\//i.test(base)) {
    const baseClean = base.replace(/\/+$/, "")
    const key = p.replace(/^\/+/, "")
    return `${baseClean}/storage/v1/object/public/${bucket}/${key}`
  }

  // Fallback: return the original path (may be a relative path in your app or handled by a proxy route).
  return p
}
