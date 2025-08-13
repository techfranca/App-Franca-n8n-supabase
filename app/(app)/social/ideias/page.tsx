"use client"

import * as React from "react"
import { PageShell } from "@/components/page-shell"
import { useAppState, useClientes } from "@/stores/app-state"
import type { Ideia } from "@/lib/types"
import { IdeaDrawer } from "@/features/social/ideias/idea-drawer"
import { NewIdeaDialog } from "@/features/social/ideias/new-idea-dialog"
import { useToast } from "@/hooks/use-toast"
import { bridge } from "@/lib/bridge"
import { Input } from "@/components/ui/input"
import { IdeasCardList } from "@/features/social/ideias/ideas-card-list"
import { Card } from "@/components/ui/card"
import { normalizeIdeasList } from "@/lib/normalize-ideas-list"
import { IDEA_STATUS, nextIdeaStatusOnClientApprove, nextIdeaStatusOnClientReject } from "@/lib/status"
import { buildIdeaUpdatePayload, buildPublicationCreateFromIdeaPayload } from "@/lib/build-payload"
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

export default function IdeiasPage() {
  const { user, cliente, periodo, setCliente, setPeriodo } = useAppState() // MUDANÇA AQUI
  const clientes = useClientes()
  const { toast } = useToast()

  const isClient = user?.role === "cliente"
  const canCreate = user?.role === "admin" || user?.role === "colaborador"

  const effectiveCliente = React.useMemo(() => {
    // Para clientes, o cliente efetivo é sempre o deles.
    if (isClient && user?.cliente_id) {
        return clientes.find((c) => c.id === user.cliente_id) ?? null
    }
    // Para admin/colaborador, usa o que está selecionado no combobox.
    return cliente
  }, [isClient, user, cliente, clientes])


  const [items, setItems] = React.useState<Ideia[]>([])
  const [localFilter, setLocalFilter] = React.useState("")
  const [selected, setSelected] = React.useState<Ideia | null>(null)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true) // Inicia como true
  const reqIdRef = React.useRef(0)

  // O cliente selecionável pelo combobox (só para admin/colab)
  const restrictedClientes = React.useMemo(() => {
    return isClient && effectiveCliente ? [effectiveCliente] : clientes
  }, [clientes, isClient, effectiveCliente])

  const refetch = React.useCallback(async () => {
    // Não busca dados se o cliente ainda não foi definido pelo StateSync
    if (!effectiveCliente && isClient) return;

    setLoading(true)
    const myReqId = ++reqIdRef.current
    try {
      const data = await bridge("ideias", "list", {
        clienteId: effectiveCliente?.id ?? null,
        periodo,
      })
      const list = normalizeIdeasList(data, isClient ? IDEA_STATUS.EM_APROVACAO : IDEA_STATUS.RASCUNHO)

      if (reqIdRef.current === myReqId) setItems(list)
    } catch (err: any) {
      if (reqIdRef.current === myReqId) {
        toast({
          title: "Erro ao carregar ideias",
          description: err?.message || String(err),
          variant: "destructive",
        })
      }
    } finally {
      if (reqIdRef.current === myReqId) setLoading(false)
    }
  }, [isClient, effectiveCliente, periodo, toast])

  React.useEffect(() => {
    // O StateSync no layout vai definir o cliente, o que acionará o refetch.
    // Nós podemos chamar o refetch diretamente quando o effectiveCliente mudar.
    refetch()
  }, [refetch])

  const filtered = React.useMemo(() => {
    const q = localFilter.toLowerCase().trim()
    if (!q) return items
    return items.filter((i) => [i.titulo, i.ideia, i.legenda].some((f) => (f ?? "").toLowerCase().includes(q)))
  }, [items, localFilter])

  function onEdit(row: Ideia) {
    setSelected(row)
    setOpen(true)
  }

  async function onDelete(row: Ideia) {
    setItems((p) => p.filter((i) => i.id !== row.id))
  }

  async function onUpdated(_next: Ideia) {
    await refetch()
  }

  function onCreated(i: Ideia) {
    setItems((prev) => [i, ...prev])
  }

  const getClienteNome = React.useCallback((id: string) => clientes.find((c) => c.id === id)?.nome ?? "—", [clientes])

  async function approve(item: Ideia, comment?: string) {
    const next = nextIdeaStatusOnClientApprove(item.status)
    const optimistic = items.map((i) => (i.id === item.id ? { ...i, status: next } : i))
    setItems(optimistic)

    try {
      const full = optimistic.find((i) => i.id === item.id) ?? item
      const payload = buildIdeaUpdatePayload(full, { status: next, comentario: comment ?? "" })
      await bridge("ideias", "update_aprovado", payload)

      const pubPayload = buildPublicationCreateFromIdeaPayload(full)
      await bridge("publicacoes", "create_from_idea", pubPayload)

      toast({ title: "Ideia aprovada e publicação criada" })
    } catch (err: any) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i)))
      toast({
        title: "Falha ao aprovar/criar publicação",
        description: err?.message || String(err),
        variant: "destructive",
      })
    } finally {
      await refetch()
    }
  }

  async function reject(item: Ideia, comment?: string) {
    if (!comment || !comment.trim()) {
      toast({ title: "Comentário é obrigatório para reprovar.", variant: "destructive" })
      return
    }
    const next = nextIdeaStatusOnClientReject(item.status)
    const prevSnapshot = items
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next, needs_reapproval: false } : i)))
    try {
      const payload = buildIdeaUpdatePayload(
        { ...item, status: next, needs_reapproval: false },
        { status: next, comentario: comment },
      )
      await bridge("ideias", "update_reprovado", payload)
      toast({ title: "Ideia reprovada" })
      await refetch()
    } catch (err: any) {
      setItems(prevSnapshot)
      toast({ title: "Falha ao reprovar", description: err?.message || String(err), variant: "destructive" })
    }
  }

  return (
    <PageShell title="Social Media · Ideias">
      <div className="flex items-center gap-3 mb-6">
        <ClientCombobox
          clientes={restrictedClientes}
          value={effectiveCliente?.id ?? null}
          onChange={(id) => {
            if (user?.role === "cliente") return
            const c = restrictedClientes.find((x) => x.id === id) ?? null
            setCliente(c)
          }}
        />
        <Separator orientation="vertical" className="h-6" />
        <MonthPicker value={periodo} onChange={setPeriodo} />
        <Separator orientation="vertical" className="h-6" />
        <Input
          placeholder="Busca (título / ideia / legenda)..."
          value={localFilter}
          onChange={(e) => setLocalFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="ml-auto">
          {canCreate && <NewIdeaDialog clienteId={effectiveCliente?.id ?? null} onCreated={onCreated} />}
        </div>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Carregando ideias...</Card>
      ) : items.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Sem ideias no período/cliente selecionado — bora criar a primeira?
        </Card>
      ) : (
        <IdeasCardList
          items={filtered}
          getClienteNome={getClienteNome}
          role={user?.role}
          onEdit={!isClient ? onEdit : undefined}
          onDelete={!isClient ? onDelete : undefined}
          onApprove={isClient ? approve : undefined}
          onReject={isClient ? reject : undefined}
        />
      )}

      <IdeaDrawer
        open={open}
        onOpenChange={setOpen}
        ideia={selected}
        onUpdated={async (_next) => {
          setOpen(false)
          toast({ title: "Ideia atualizada com sucesso" })
          await refetch()
        }}
        onDeleted={async (_id) => {
          await refetch()
        }}
      />
    </PageShell>
  )
}
