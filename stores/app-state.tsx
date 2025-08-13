"use client"
import { createContext, useContext, useMemo, useState, useEffect } from "react"
import type React from "react"
import type { Cliente, AuthUser } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase-client" // Importamos o cliente Supabase

type Periodo = { month: number; year: number }
type AppState = {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  cliente: Cliente | null
  setCliente: (c: Cliente | null) => void
  clientes: Cliente[] // A lista de clientes agora virá do Supabase
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  search: string
  setSearch: (s: string) => void
}

const AppStateContext = createContext<AppState | undefined>(undefined)

const DEFAULT_PERIODO: Periodo = { month: new Date().getMonth() + 1, year: new Date().getFullYear() }

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([]) // Estado para a lista de clientes
  const [periodo, setPeriodo] = useState<Periodo>(DEFAULT_PERIODO)
  const [search, setSearch] = useState("")

  // --- MUDANÇA PRINCIPAL AQUI ---
  // Hook para buscar os clientes do Supabase quando a aplicação carregar
  useEffect(() => {
    async function fetchClientes() {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) return

      // Busca 'id' e 'nome' da sua tabela 'clientes'
      const { data, error } = await supabase.from('clientes').select('id, nome')
      
      if (error) {
        console.error("Erro ao buscar clientes:", error)
        return
      }
      setClientes(data as Cliente[])
    }
    fetchClientes()
  }, []) // O array vazio [] garante que isso só rode uma vez

  const value = useMemo(
    () => ({ user, setUser, cliente, setCliente, clientes, periodo, setPeriodo, search, setSearch }),
    [user, cliente, clientes, periodo, search],
  )
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider")
  return ctx
}

// A função useClientes agora simplesmente consome o estado que já foi buscado.
export function useClientes() {
    const { clientes } = useAppState();
    return clientes;
}
