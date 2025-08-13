"use client"

import * as React from "react"
import { PageShell } from "@/components/page-shell"
import { useAppState, useClientes } from "@/stores/app-state"
import type { Publicacao, Ideia } from "@/lib/types"
import { PubsCardList } from "@/features/social/publicacoes/pubs-card-list"
import { PublicationDrawer } from "@/features/social/publicacoes/publication-drawer"
import { bridge } from "@/lib/bridge"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { normalizeIdeasList } from "@/lib/normalize-ideas-list"
import { isoNow } from "@/lib/utils-date"
import { buildPublicationUpdatePayload } from "@/lib/build-payload"
import { normalizePublicationsList } from "@/lib/normalize-publications-list"
import { toast } from "@/components/ui/use-toast"
import { ClientCombobox } from "@/components/client-combobox"
import { formatMonthYear } from "@/lib/utils-date"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import { addMonths } from "date-fns"
import { Separator } from "@/components/ui/separator"

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

export default function PublicacoesPage() {
  const { user, cliente, periodo, setCliente, setPeriodo } = useAppState()
  const clientes = useClientes()
  const role = (user?.role ?? "admin") as "admin" | "colaborador" | "cliente"

  const [items, setItems] = React.useState<Publicacao[]>([])
  const [loading, setLoading] = React.useState(true)
  const [localFilter, setLocalFilter] = React.useState("")
  const [sel, setSel] = React.useState<Publicacao | null>(null)
  const [open, setOpen] = React.useState(false)
  const [ideasById, setIdeasById] = React.useState<Record<string, Ideia>>({})

  const restrictedClientes = React.useMemo(() => {
    if (user?.role === "cliente" && user.cliente_id) {
      const myClient = clientes.find((c) => c.id === user.cliente_id)
      return myClient ? [myClient] : clientes
    }
    return clientes
  }, [clientes, user?.role, user?.cliente_id])

  const refetch = React.useCallback(async () => {
    const clienteIdForFetch = user?.role === "cliente" ? user.cliente_id : (cliente?.id ?? null)

    console.log("DEBUG FILTRO PUBLICAÇÕES:", {
      userRole: user?.role,
      userClienteId: user?.cliente_id,
      clienteIdForFetch,
      clienteNome: cliente?.nome,
    })

    if (user?.role === "cliente" && !clienteIdForFetch) {
      console.log("DEBUG: Cliente sem cliente_id, retornando array vazio")
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await bridge<any, unknown>("publicacoes", "list", {
        clienteId: clienteIdForFetch,
        periodo,
      })

      console.log("DEBUG: Dados retornados do backend:", data)

      const list = normalizePublicationsList(data)

      console.log("DEBUG: Dados normalizados:", list)

      setItems(list)
    } catch (err: any) {
      console.log("DEBUG: Erro ao carregar publicações:", err)
      setItems([])
      toast({
        title: "Erro ao carregar publicações",
        description: err?.message || String(err),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, cliente, periodo])

  React.useEffect(() => {
    if (user) {
      refetch()
    }
  }, [refetch, user])

  React.useEffect(() => {
    if (!user) return

    let mounted = true
    ;(async () => {
      const clienteIdForFetch = user?.role === "cliente" ? user.cliente_id : (cliente?.id ?? null)
      try {
        const data = await bridge("ideias", "list", { clienteId: clienteIdForFetch, periodo })
        const list = normalizeIdeasList(data)
        const map: Record<string, Ideia> = {}
        for (const i of list) map[i.id] = i
        if (mounted) setIdeasById(map)
      } catch {
        if (mounted) setIdeasById({})
      }
    })()
    return () => {
      mounted = false
    }
  }, [user, cliente?.id, periodo])

  const filtered = React.useMemo(() => {
    const q = localFilter.toLowerCase().trim()
    if (!q) return items
    return items.filter((p) => [p.titulo, p.legenda].some((f) => (f ?? "").toLowerCase().includes(q)))
  }, [items, localFilter])

  function onEdit(row: Publicacao) {
    setSel(row)
    setOpen(true)
  }

  function onDelete(row: Publicacao) {
    setItems((prev) => prev.filter((p) => p.id !== row.id))
    toast({
      title: "Publicação excluída",
      description: `A publicação "${row.titulo}" foi removida com sucesso.`,
    })
  }

  function onUpdated(next: Publicacao) {
    setItems((prev) => prev.map((p) => (p.id === next.id ? next : p)))
  }

  async function onPublish(row: Publicacao) {
    const updated: Publicacao = { ...row, status: "publicada", data_postagem: isoNow() }
    onUpdated(updated) // Otimista
    try {
      const payload = buildPublicationUpdatePayload(updated)
      await bridge("publicacoes", "update", payload)
      toast({ title: "Publicação marcada como publicada!" })
    } catch {
      onUpdated(row) // Reverte em caso de erro
      toast({ title: "Erro ao atualizar status", variant: "destructive" })
    }
  }

  const getClienteNome = React.useCallback((id: string) => clientes.find((c) => c.id === id)?.nome ?? "—", [clientes])
  const getIdeaById = React.useCallback((id?: string | null) => (id ? (ideasById[id] ?? null) : null), [ideasById])

  const clienteIdForFetch = user?.role === "cliente" ? user.cliente_id : (cliente?.id ?? null)

  return (
    <PageShell>
      

      <div className="flex items-center gap-3 mb-6">
        <ClientCombobox
          clientes={restrictedClientes}
          value={cliente?.id ?? null}
          onChange={(id) => {
            if (user?.role === "cliente") return
            const c = restrictedClientes.find((x) => x.id === id) ?? null
            setCliente(c)
          }}
          disabled={role === "cliente"}
        />
        <Separator orientation="vertical" className="h-6" />
        <MonthPicker value={periodo} onChange={setPeriodo} />
        <Separator orientation="vertical" className="h-6" />
        <Input
          value={localFilter}
          onChange={(e) => setLocalFilter(e.target.value)}
          placeholder="Busca (título / legenda)..."
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Carregando publicações...</Card>
      ) : items.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">Sem publicações no período/cliente selecionado.</Card>
      ) : (
        <PubsCardList
          items={filtered}
          role={role}
          userClienteId={user?.cliente_id} // Adicionando userClienteId para filtro de segurança
          onEdit={onEdit}
          onDelete={onDelete}
          onPublish={onPublish}
          onUpdated={onUpdated}
          getClienteNome={getClienteNome}
          getIdeaById={getIdeaById}
        />
      )}

      <PublicationDrawer
        open={open}
        onOpenChange={setOpen}
        pub={sel}
        onUpdated={onUpdated}
        onDeleted={(id) => setItems((prev) => prev.filter((p) => p.id !== id))}
      />
    </PageShell>
  )
}
