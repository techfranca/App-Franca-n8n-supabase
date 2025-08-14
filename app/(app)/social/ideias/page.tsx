"use client"

import * as React from "react"
import { PageShell } from "@/components/page-shell"
import { useAppState, useClientes } from "@/stores/app-state"
import type { Ideia, Formato, Plataforma, IdeiaStatus } from "@/lib/types"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formatos: Formato[] = ["Reels", "Carrossel", "Imagem única", "Stories", "Outro"]
const plataformas: Plataforma[] = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn"]

const statusOptions: { value: IdeiaStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "ideia_criada", label: "Ideia Criada" },
  { value: "ideia_em_aprovacao", label: "Em Aprovação" },
  { value: "ideia_em_alteracao", label: "Em Alteração" },
  { value: "em_design", label: "Em Design" },
  { value: "aprovada", label: "Aprovada" },
  { value: "reprovada", label: "Reprovada" },
]

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
  const { user, cliente, periodo, setCliente, setPeriodo } = useAppState()
  const clientes = useClientes()
  const { toast } = useToast()

  const isClient = user?.role === "cliente"
  const canCreate = user?.role === "admin" || user?.role === "colaborador"
  const canUseAdvancedFilters = user?.role === "admin" || user?.role === "colaborador"

  const effectiveCliente = cliente

  const [items, setItems] = React.useState<Ideia[]>([])
  const [localFilter, setLocalFilter] = React.useState("")
  const [formatoFilter, setFormatoFilter] = React.useState<string>("todos")
  const [plataformaFilter, setPlataformaFilter] = React.useState<string>("todos")
  const [statusFilter, setStatusFilter] = React.useState<string>("todos")
  const [selected, setSelected] = React.useState<Ideia | null>(null)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (user?.role === "cliente") {
      setStatusFilter("ideia_em_aprovacao")
    }
  }, [user?.role])

  const clienteIdForFetch = user?.role === "cliente" ? user.cliente_id : (cliente?.id ?? null)

  const refetch = React.useCallback(async () => {
    if (user?.role === "cliente" && !clienteIdForFetch) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await bridge("ideias", "list", {
        clienteId: clienteIdForFetch,
        periodo,
      })
      const list = normalizeIdeasList(data as Ideia[], IDEA_STATUS.RASCUNHO)
      setItems(list)
    } catch (err: any) {
      setItems([])
      toast({
        title: "Erro ao carregar ideias",
        description: err?.message || String(err),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user, cliente, periodo, toast])

  React.useEffect(() => {
    if (user) {
      refetch()
    }
  }, [refetch, user])

  const filtered = React.useMemo(() => {
    let result = items

    if (canUseAdvancedFilters && cliente?.id) {
      result = result.filter((i) => i.cliente_id === cliente.id)
    }

    if (periodo) {
      result = result.filter((i) => {
        if (!i.data_criacao) return true
        const itemDate = new Date(i.data_criacao)
        return itemDate.getMonth() + 1 === periodo.month && itemDate.getFullYear() === periodo.year
      })
    }

    const q = localFilter.toLowerCase().trim()
    if (q) {
      result = result.filter((i) => [i.titulo, i.ideia, i.legenda].some((f) => (f ?? "").toLowerCase().includes(q)))
    }

    if (formatoFilter !== "todos") {
      result = result.filter((i) => i.formato === formatoFilter)
    }

    if (plataformaFilter !== "todos") {
      result = result.filter((i) => i.plataforma === plataformaFilter)
    }

    if (statusFilter !== "todos") {
      result = result.filter((i) => i.status === statusFilter)
    }

    return result
  }, [items, localFilter, formatoFilter, plataformaFilter, statusFilter, cliente, periodo, canUseAdvancedFilters])

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

  function onEdit(row: Ideia) {
    setSelected(row)
    setOpen(true)
  }

  async function onDelete(row: Ideia) {
    setItems((p) => p.filter((i) => i.id !== row.id))
  }

  const handleStatusChange = React.useCallback((ideiaId: string, newStatus: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === ideiaId ? { ...item, status: newStatus as any } : item)),
    )
  }, [])

  return (
    <PageShell title="Social Media · Ideias">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <ClientCombobox
          clientes={clientes}
          value={cliente?.id ?? null}
          onChange={(id) => {
            if (isClient) return
            const c = clientes.find((x) => x.id === id) ?? null
            setCliente(c)
          }}
          disabled={isClient}
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canUseAdvancedFilters && (
          <>
            <Select value={formatoFilter} onValueChange={setFormatoFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos formatos</SelectItem>
                {formatos.map((formato) => (
                  <SelectItem key={formato} value={formato}>
                    {formato}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={plataformaFilter} onValueChange={setPlataformaFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas plataformas</SelectItem>
                {plataformas.map((plataforma) => (
                  <SelectItem key={plataforma} value={plataforma}>
                    {plataforma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <div className="ml-auto">
          {canCreate && <NewIdeaDialog clienteId={effectiveCliente?.id ?? null} onCreated={refetch} />}
        </div>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Carregando ideias...</Card>
      ) : items.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">Sem ideias no período/cliente selecionado.</Card>
      ) : (
        <IdeasCardList
          items={filtered}
          getClienteNome={getClienteNome}
          role={user?.role}
          userClienteId={user?.cliente_id}
          onEdit={!isClient ? onEdit : undefined}
          onDelete={!isClient ? onDelete : undefined}
          onApprove={isClient ? approve : undefined}
          onReject={isClient ? reject : undefined}
          onStatusChange={handleStatusChange} // Passando callback para atualizar status em tempo real
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
