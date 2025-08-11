"use client"

import * as React from "react"
import { PageShell } from "@/components/page-shell"
import { useAppState, useClientes } from "@/stores/app-state"
import type { Ideia } from "@/lib/types"
import { IdeaDrawer } from "@/features/social/ideias/idea-drawer"
import { NewIdeaDialog } from "@/features/social/ideias/new-idea-dialog"
import { ImportCsvDialog } from "@/features/social/ideias/import-csv-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { bridge } from "@/lib/bridge"
import { downloadCSV, toCSV } from "@/lib/csv"
import { Input } from "@/components/ui/input"
import { IdeasCardList } from "@/features/social/ideias/ideas-card-list"
import { Card } from "@/components/ui/card"
import { normalizeIdeasList } from "@/lib/normalize-ideas-list"
import { getUser } from "@/lib/auth-client"
import { IDEA_STATUS, nextIdeaStatusOnClientApprove, nextIdeaStatusOnClientReject } from "@/lib/status"
import { buildIdeaUpdatePayload, buildPublicationCreateFromIdeaPayload } from "@/lib/build-payload"

export default function IdeiasPage() {
  const { cliente, periodo, search } = useAppState()
  const clientes = useClientes()
  const { toast } = useToast()
  const user = React.useMemo(() => getUser(), [])
  const isClient = user?.role === "cliente"
  const canCreate = user?.role === "admin" || user?.role === "colaborador"

  const effectiveCliente = React.useMemo(() => {
    if (!isClient) return cliente
    if (user?.cliente_id) {
      return clientes.find((c) => c.id === user.cliente_id) ?? cliente
    }
    const matchByName = clientes.find((c) => c.nome.toLowerCase() === (user?.name || "").toLowerCase())
    return matchByName ?? cliente
  }, [isClient, clientes, user?.cliente_id, user?.name, cliente])

  const [items, setItems] = React.useState<Ideia[]>([])
  const [localFilter, setLocalFilter] = React.useState("")
  const [selected, setSelected] = React.useState<Ideia | null>(null)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const reqIdRef = React.useRef(0)

  const refetch = React.useCallback(async () => {
    if (isClient && !effectiveCliente?.id) return
    setLoading(true)
    const myReqId = ++reqIdRef.current
    try {
      const data = await bridge("ideias", "list", {
        clienteId: effectiveCliente?.id ?? cliente?.id ?? null,
        periodo,
      })
      let list = normalizeIdeasList(data, isClient ? IDEA_STATUS.EM_APROVACAO : IDEA_STATUS.RASCUNHO)

      if (isClient && effectiveCliente?.id) {
        const cid = effectiveCliente.id
        list = list.filter(
          (i) =>
            i.cliente_id === cid ||
            (i.cliente_nome && i.cliente_nome.toLowerCase() === (effectiveCliente.nome || "").toLowerCase()),
        )
      }

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
  }, [isClient, effectiveCliente?.id, effectiveCliente?.nome, cliente?.id, periodo, toast])

  React.useEffect(() => {
    refetch()
  }, [refetch])

  const filtered = React.useMemo(() => {
    const q = (localFilter || search || "").toLowerCase().trim()
    if (!q) return items
    return items.filter((i) => [i.titulo, i.ideia, i.legenda].some((f) => (f ?? "").toLowerCase().includes(q)))
  }, [items, localFilter, search])

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

  function exportarCSV() {
    const csv = toCSV(filtered)
    downloadCSV("ideias.csv", csv)
  }

  const getClienteNome = React.useCallback((id: string) => clientes.find((c) => c.id === id)?.nome ?? "—", [clientes])

  // Aprovação do cliente: envia update_aprovado e, após sucesso, cria publicação via webhook
  async function approve(item: Ideia, comment?: string) {
    const next = nextIdeaStatusOnClientApprove(item.status)
    // Otimista: muda status para em_design e esconde moderação
    const optimistic = items.map((i) => (i.id === item.id ? { ...i, status: next } : i))
    setItems(optimistic)

    try {
      const full = optimistic.find((i) => i.id === item.id) ?? item
      const payload = buildIdeaUpdatePayload(full, { status: next, comentario: comment ?? "" })
      await bridge("ideias", "update_aprovado", payload)

      // 1) Criar publicação a partir da ideia aprovada (envia TODOS os campos da ideia)
      const pubPayload = buildPublicationCreateFromIdeaPayload(full)
      try {
        await bridge("publicacoes", "create_from_idea", pubPayload)
      } catch (e1: any) {
        // Fallback: alguns fluxos podem esperar apenas "create"
        await bridge("publicacoes", "create", pubPayload)
      }

      // 2) Done
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
    // Otimista: fecha botões e campo de comentário
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
      <div className="flex items-center gap-2 mb-3">
        {canCreate && <NewIdeaDialog clienteId={effectiveCliente?.id ?? cliente?.id ?? null} onCreated={onCreated} />}
        {canCreate && <ImportCsvDialog />}
        <Button variant="outline" onClick={exportarCSV}>
          Exportar CSV
        </Button>
        <div className="ml-auto">
          <Input
            placeholder="Busca (título / ideia / legenda)..."
            value={localFilter}
            onChange={(e) => setLocalFilter(e.target.value)}
            className="max-w-xs"
          />
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
          role={isClient ? "cliente" : (user?.role as any)}
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
