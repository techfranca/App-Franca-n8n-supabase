"use client"

import * as React from "react"
import { PageShell } from "@/components/page-shell"
import { useAppState, useClientes } from "@/stores/app-state"
import type { Publicacao, Ideia, Formato, Plataforma, PublicacaoStatus } from "@/lib/types"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const formatos: Formato[] = ["Reels", "Carrossel", "Imagem única", "Stories", "Outro"]
const plataformas: Plataforma[] = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn"]

const statusOptions: { value: PublicacaoStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "em_design", label: "Em Design" },
  { value: "publicacao_em_aprovacao", label: "Em Aprovação" },
  { value: "publicacao_em_alteracao", label: "Em Alteração" },
  { value: "aprovado", label: "Aprovado" },
  { value: "agendada", label: "Agendada" },
  { value: "publicada", label: "Publicada" },
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

export default function PublicacoesPage() {
  const { user, cliente, periodo, setCliente, setPeriodo } = useAppState()
  const clientes = useClientes()
  const role = (user?.role ?? "admin") as "admin" | "colaborador" | "cliente"
  const canUseAdvancedFilters = user?.role === "admin" || user?.role === "colaborador"

  const [items, setItems] = React.useState<Publicacao[]>([])
  const [loading, setLoading] = React.useState(true)
  const [localFilter, setLocalFilter] = React.useState("")
  const [formatoFilter, setFormatoFilter] = React.useState<string>("todos")
  const [plataformaFilter, setPlataformaFilter] = React.useState<string>("todos")
  const [statusFilter, setStatusFilter] = React.useState<string>("todos")
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

    if (user?.role === "cliente" && !clienteIdForFetch) {
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

      const list = normalizePublicationsList(data)
      setItems(list)
    } catch (err: any) {
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
    let result = items

    if (canUseAdvancedFilters && cliente?.id) {
      result = result.filter((p) => p.cliente_id === cliente.id)
    }

    if (periodo) {
      result = result.filter((p) => {
        if (!p.data_criacao) return true
        const itemDate = new Date(p.data_criacao)
        return itemDate.getMonth() + 1 === periodo.month && itemDate.getFullYear() === periodo.year
      })
    }

    // Filtro de busca por texto
    const q = localFilter.toLowerCase().trim()
    if (q) {
      result = result.filter((p) => [p.titulo, p.legenda].some((f) => (f ?? "").toLowerCase().includes(q)))
    }

    if (formatoFilter !== "todos") {
      result = result.filter((p) => p.formato === formatoFilter)
    }

    if (plataformaFilter !== "todos") {
      result = result.filter((p) => p.plataforma === plataformaFilter)
    }

    if (statusFilter !== "todos") {
      result = result.filter((p) => p.status === statusFilter)
    }

    return result
  }, [items, localFilter, formatoFilter, plataformaFilter, statusFilter, cliente, periodo, canUseAdvancedFilters])

  const getClienteNome = React.useCallback((id: string) => clientes.find((c) => c.id === id)?.nome ?? "—", [clientes])
  const getIdeaById = React.useCallback((id?: string | null) => (id ? (ideasById[id] ?? null) : null), [ideasById])

  const clienteIdForFetch = user?.role === "cliente" ? user.cliente_id : (cliente?.id ?? null)

  const onEdit = React.useCallback((pub: Publicacao) => {
    setSel(pub)
    setOpen(true)
  }, [])

  const onDelete = React.useCallback(async (pub: Publicacao) => {
    try {
      await bridge("publicacoes", "delete", { id: pub.id })
      setItems((prev) => prev.filter((p) => p.id !== pub.id))
      toast({
        title: "Publicação excluída",
        description: `A publicação "${pub.titulo}" foi excluída com sucesso.`,
      })
    } catch (err: any) {
      toast({
        title: "Erro ao excluir publicação",
        description: err?.message || String(err),
        variant: "destructive",
      })
    }
  }, [])

  const onPublish = React.useCallback(async (pub: Publicacao) => {
    try {
      const payload = buildPublicationUpdatePayload(pub, { status: "publicada", data_publicacao: isoNow() })
      await bridge("publicacoes", "update", payload)
      setItems((prev) => prev.map((p) => (p.id === pub.id ? { ...p, ...payload } : p)))
      toast({
        title: "Publicação publicada",
        description: `A publicação "${pub.titulo}" foi publicada com sucesso.`,
      })
    } catch (err: any) {
      toast({
        title: "Erro ao publicar publicação",
        description: err?.message || String(err),
        variant: "destructive",
      })
    }
  }, [])

  const onUpdated = React.useCallback((pub: Publicacao) => {
    setItems((prev) => prev.map((p) => (p.id === pub.id ? pub : p)))
    toast({
      title: "Publicação atualizada",
      description: `A publicação "${pub.titulo}" foi atualizada com sucesso.`,
    })
  }, [])

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
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
