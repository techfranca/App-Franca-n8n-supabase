"use client"
import { createContext, useContext, useMemo, useState, useEffect } from "react"
import type React from "react"
import type { Cliente, AuthUser } from "@/lib/types"
import { TODOS_OS_CLIENTES } from "@/lib/database" // Importa a lista de clientes

type Periodo = { month: number; year: number }
type AppState = {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  cliente: Cliente | null
  setCliente: (c: Cliente | null) => void
  clientes: Cliente[]
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
  const [periodo, setPeriodo] = useState<Periodo>(DEFAULT_PERIODO)
  const [search, setSearch] = useState("")

  const value = useMemo(
    () => ({ user, setUser, cliente, setCliente, clientes: TODOS_OS_CLIENTES, periodo, setPeriodo, search, setSearch }),
    [user, cliente, periodo, search],
  )
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider")
  return ctx
}

// Esta função agora é mais simples
export function useClientes() {
    const { clientes } = useAppState();
    return clientes;
}
