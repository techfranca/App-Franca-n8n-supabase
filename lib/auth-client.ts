import type { AuthUser } from "./types"

const AUTH_KEY = "franca_auth_user"

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!getUser()
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  // apenas stub - chama /api/auth/login
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (json?.ok && json?.data?.user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(json.data.user))
      return { ok: true, user: json.data.user }
    }
    return { ok: false, error: json?.error ?? "Falha no login" }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Erro desconhecido" }
  }
}

export function signOut() {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_KEY)
}

export function setRole(role: AuthUser["role"]) {
  const current = getUser()
  if (!current) return
  const next = { ...current, role }
  localStorage.setItem("franca_auth_user", JSON.stringify(next))
}
