"use client"

import type { AuthUser } from "./types"
import { getSupabaseBrowserClient } from "./supabase-client"
import { useAppState } from "@/stores/app-state" // Importação correta

// Função para buscar o perfil do usuário logado no Supabase
async function getProfileFromSupabase(userId: string) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return null

  // Busca o perfil na nossa tabela 'profiles' para pegar a role e o cliente_id
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, cliente_id")
    .eq("id", userId) // Usa o ID do usuário diretamente
    .single()

  if (error || !profile) {
    console.error("Perfil não encontrado para o usuário:", error)
    return null
  }
  
  const { data: { user } } = await supabase.auth.getUser()

  return {
    id: user?.id || userId,
    name: user?.email || "Usuário",
    email: user?.email || "",
    role: profile.role as AuthUser["role"],
    cliente_id: profile.cliente_id,
  }
}

// Retorna os dados do usuário logado
export async function getUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return null
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  return await getProfileFromSupabase(user.id)
}

export async function isAuthenticated(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return false
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

// Função de Login
export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return { ok: false, error: "Supabase não configurado." }

  // 1. Faz o login
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError || !signInData.user) {
    return { ok: false, error: "Credenciais inválidas" }
  }

  // 2. Com o login bem-sucedido, busca o perfil
  const userProfile = await getProfileFromSupabase(signInData.user.id)
  
  if (!userProfile) {
    await supabase.auth.signOut() // Desloga se não encontrar perfil
    return { ok: false, error: "Usuário não possui um perfil configurado." }
  }
  
  return { ok: true, user: userProfile }
}

// Função de Logout
export async function signOut() {
  const supabase = getSupabaseBrowserClient()
  if (supabase) {
    await supabase.auth.signOut()
  }
  // Limpa o cliente do estado global ao fazer logout
  // Usando .getState() para acessar o store fora de um componente React
  useAppState.getState().setCliente(null);
}

// Esta função não é mais necessária, pois a role é gerenciada pelo banco
export function setRole(role: AuthUser["role"]) {
  console.warn("A role agora é gerenciada pelo Supabase na tabela 'profiles'. Esta função não tem efeito.")
}
