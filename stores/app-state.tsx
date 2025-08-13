"use client"
import { createContext, useContext, useMemo, useState, useEffect } from "react"
import type React from "react"
import type { Cliente, AuthUser } from "@/lib/types"

type Periodo = { month: number; year: number }
type AppState = {
  user: AuthUser | null // Adicionado para guardar o usuário logado
  setUser: (user: AuthUser | null) => void // Adicionado
  cliente: Cliente | null
  setCliente: (c: Cliente | null) => void
  periodo: Periodo
  setPeriodo: (p: Periodo) => void
  search: string
  setSearch: (s: string) => void
}

const AppStateContext = createContext<AppState | undefined>(undefined)

const DEFAULT_PERIODO: Periodo = { month: new Date().getMonth() + 1, year: new Date().getFullYear() }

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null) // Adicionado
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [periodo, setPeriodo] = useState<Periodo>(DEFAULT_PERIODO)
  const [search, setSearch] = useState("")

  const value = useMemo(
    () => ({ user, setUser, cliente, setCliente, periodo, setPeriodo, search, setSearch }),
    [user, cliente, periodo, search],
  )
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider")
  return ctx
}

// mock simples de clientes
export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  useEffect(() => {
    // Idealmente, isso viria de uma chamada de API
    setClientes([
      { id: "cli_3haus", nome: "3haus" },
      { id: "cli_auramar", nome: "Auramar" },
      { id: "cli_caminho_do_surf", nome: "Caminho do surf" },
      // Adicione seus outros clientes aqui
    ])
  }, [])
  return clientes
}
