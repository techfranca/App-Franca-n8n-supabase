"use client"

import type { AuthUser } from "./types"
import { TODOS_OS_USUARIOS } from "./database" // Importamos nossa lista de usuários

const AUTH_KEY = "franca_auth_user"

// Retorna os dados do usuário logado a partir do localStorage
export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

// Verifica se há um usuário no localStorage
export function isAuthenticated(): boolean {
  return !!getUser()
}

// Função de Login que verifica na nossa lista
export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  const user = TODOS_OS_USUARIOS.find(u => u.email === email && u.password === password)

  if (user) {
    // Se encontrou, salva o usuário no localStorage para simular a sessão
    const { password, ...userToStore } = user // Remove a senha antes de salvar
    localStorage.setItem(AUTH_KEY, JSON.stringify(userToStore))
    return { ok: true, user: userToStore as AuthUser }
  }

  return { ok: false, error: "Credenciais inválidas" }
}

// Função de Logout
export function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY)
  }
}

// Esta função pode ser usada para simular a troca de roles em desenvolvimento
export function setRole(role: AuthUser["role"]) {
  const currentUser = getUser()
  if (currentUser) {
    const updatedUser = { ...currentUser, role }
    localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser))
    window.location.reload(); // Recarrega para aplicar as mudanças
  }
}
