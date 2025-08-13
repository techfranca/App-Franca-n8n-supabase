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

// Converte path relativo do bucket em URL pública confiável
export function publicUrlFromPath(path?: string | null): string | null {
  if (!path) return null
  const raw = String(path).trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  let p = raw.replace(/^\/+/, "")
  p = p.replace(/^publicacoes\/+/i, "")
  
  const client = getSupabaseBrowserClient()
  if (!client) return `/${p}`
  
  const { data } = client.storage.from("publicacoes").getPublicUrl(p)
  return data?.publicUrl ?? `/${p}`
}

// Faz upload para o bucket "publicacoes" e retorna somente paths relativos
export async function uploadMediaFilesToSupabase(
  files: File[],
  opts?: { folder?: string },
): Promise<{ path: string }[]> {
  const client = getSupabaseBrowserClient()
  if (!client) {
    throw new Error("Cliente Supabase não inicializado. Verifique as variáveis de ambiente.");
  }
  
  const folder = (opts?.folder || "uploads").replace(/^\/+/, "").replace(/\/+$/, "")
  const upserts = files.map(async (f) => {
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}_${f.name}`
    const path = `${folder}/${name}`
    
    // MUDANÇA IMPORTANTE: Removida a opção { upsert: true }
    const { error } = await client.storage.from("publicacoes").upload(path, f, {
      contentType: f.type || undefined,
    })

    if (error) {
      console.error("Supabase Upload Error:", error);
      throw error;
    }
    return { path }
  })
  return Promise.all(upserts)
}
