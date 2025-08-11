"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ClientCombobox } from "./client-combobox"
import { useAppState, useClientes } from "@/stores/app-state"
import { formatMonthYear } from "@/lib/utils-date"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import { addMonths } from "date-fns"
import { GlobalSearch } from "./global-search"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getUser, setRole, signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import type { AuthUser } from "@/lib/types"
import { APP_VERSION } from "@/lib/version"

function MonthPicker({
  value,
  onChange,
}: {
  value: { month: number; year: number }
  onChange: (v: { month: number; year: number }) => void
}) {
  const current = new Date(value.year, value.month - 1, 1)
  function shift(offset: number) {
    const d = addMonths(current, offset)
    onChange({ month: d.getMonth() + 1, year: d.getFullYear() })
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => shift(-1)}>
        {"<"}
      </Button>
      <div className="flex items-center gap-2 px-2 text-sm">
        <Calendar className="h-4 w-4" />
        {formatMonthYear(current)}
      </div>
      <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => shift(1)}>
        {">"}
      </Button>
    </div>
  )
}

export function Topbar({ title = "Franca Insights" }: { title?: string }) {
  const allClientes = useClientes()
  const { cliente, setCliente, periodo, setPeriodo } = useAppState()
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(getUser())

  useEffect(() => {
    setUser(getUser())
  }, [])

  const myClient = useMemo(() => {
    if (user?.role !== "cliente") return null
    if (user?.cliente_id) {
      return allClientes.find((c) => c.id === user.cliente_id) ?? null
    }
    const byName = allClientes.find((c) => c.nome.toLowerCase() === (user?.name || "").toLowerCase())
    return byName ?? null
  }, [allClientes, user?.role, user?.cliente_id, user?.name])

  useEffect(() => {
    if (user?.role === "cliente" && myClient && (!cliente || cliente.id !== myClient.id)) {
      setCliente(myClient)
    }
  }, [user?.role, myClient, cliente, setCliente])

  const restrictedClientes = useMemo(() => {
    return user?.role === "cliente" && myClient ? [myClient] : allClientes
  }, [allClientes, user?.role, myClient])

  return (
    <header className="sticky top-0 z-30 bg-white border-b">
      <div className="flex h-14 items-center gap-3 px-4">
        <h1 className="text-[#081534] font-semibold">{title}</h1>
        <Badge className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]">Franca</Badge>
        <Badge variant="outline" className="border-[#4b8655] text-[#4b8655]">
          {APP_VERSION}
        </Badge>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <ClientCombobox
          clientes={restrictedClientes}
          value={cliente?.id ?? null}
          onChange={(id) => {
            if (user?.role === "cliente") return
            const c = restrictedClientes.find((x) => x.id === id) ?? null
            setCliente(c)
          }}
        />
        <Separator orientation="vertical" className="mx-2 h-6" />
        <MonthPicker value={periodo} onChange={setPeriodo} />
        <div className="flex-1" />
        <GlobalSearch />
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.name?.slice(0, 2).toUpperCase() || "US"}</AvatarFallback>
              </Avatar>
              <div className="text-sm hidden md:block">
                <div className="font-medium text-[#081534]">{user?.name || "Usuário"}</div>
                <div className="text-muted-foreground capitalize">{user?.role || "desconhecido"}</div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => {
                setRole("cliente")
                setUser(getUser())
              }}
            >
              Tornar Cliente
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setRole("colaborador")
                setUser(getUser())
              }}
            >
              Tornar Colaborador
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setRole("admin")
                setUser(getUser())
              }}
            >
              Tornar Admin
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                signOut()
                router.push("/login")
              }}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
