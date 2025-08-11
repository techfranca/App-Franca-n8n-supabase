"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Singleton do Supabase no browser
let supabase: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    if (typeof window !== "undefined") {
      console.warn(
        "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no projeto.",
      )
    }
    return null
  }
  if (!supabase) {
    supabase = createClient(url, key, { auth: { persistSession: false } })
  }
  return supabase
}

// Converte path relativo do bucket "midia" em URL pública confiável
// - Se já for URL absoluta, retorna como está
// - Normaliza removendo "/" à esquerda e prefixo opcional "midia/"
// - Fallback local: retorna "/<path>"
export function publicUrlFromPath(path?: string | null): string | null {
  if (!path) return null
  const raw = String(path).trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  let p = raw.replace(/^\/+/, "")
  p = p.replace(/^midia\/+/i, "")
  const client = getSupabaseBrowserClient()
  if (!client) return `/${p}`
  const { data } = client.storage.from("midia").getPublicUrl(p)
  return data?.publicUrl ?? `/${p}`
}

// Fallback local (preview) — armazena em memória na rota /api/uploads
async function uploadViaLocalApi(files: File[], opts?: { folder?: string }): Promise<{ path: string }[]> {
  const form = new FormData()
  for (const f of files) form.append("files", f, f.name)
  if (opts?.folder) form.append("folder", opts.folder)
  const res = await fetch("/api/uploads", { method: "POST", body: form })
  if (!res.ok) throw new Error(`Falha no upload local (${res.status})`)
  const json = (await res.json()) as { files: { id: string; path: string }[] }
  return (json.files || []).map((f) => ({ path: f.path }))
}

// Faz upload para o bucket "midia" e retorna somente paths relativos
export async function uploadMediaFilesToSupabase(
  files: File[],
  opts?: { folder?: string },
): Promise<{ path: string }[]> {
  const client = getSupabaseBrowserClient()
  if (!client) return uploadViaLocalApi(files, opts)
  const folder = (opts?.folder || "uploads").replace(/^\/+/, "").replace(/\/+$/, "")
  const upserts = files.map(async (f) => {
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}_${f.name}`
    const path = `${folder}/${name}`
    const { error } = await client.storage.from("midia").upload(path, f, {
      contentType: f.type || undefined,
      upsert: true,
    })
    if (error) throw error
    return { path }
  })
  return Promise.all(upserts)
}
