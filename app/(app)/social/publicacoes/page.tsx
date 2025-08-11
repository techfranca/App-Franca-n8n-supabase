"use client"

import * as React from "react"
import { PageShell } from "@/components/page-shell"
import { useAppState, useClientes } from "@/stores/app-state"
import type { Publicacao, Ideia } from "@/lib/types"
import { PubsCardList } from "@/features/social/publicacoes/pubs-card-list"
import { PublicationDrawer } from "@/features/social/publicacoes/publication-drawer"
import { bridge } from "@/lib/bridge"
import { Button } from "@/components/ui/button"
import { CreateFromIdeaDialog } from "@/features/social/publicacoes/create-from-idea-dialog"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { normalizeIdeasList } from "@/lib/normalize-ideas-list"
import { getUser } from "@/lib/auth-client"
import { isoNow } from "@/lib/utils-date"
import { buildPublicationUpdatePayload } from "@/lib/build-payload"
import { normalizePublicationsList } from "@/lib/normalize-publications-list"
import { toast } from "@/components/ui/use-toast"

export default function PublicacoesPage() {
  const { cliente, periodo, search } = useAppState()
  const clientes = useClientes()
  const user = React.useMemo(() => getUser(), [])
  const role = (user?.role ?? "admin") as "admin" | "colaborador" | "cliente"

  const [items, setItems] = React.useState<Publicacao[]>([])
  const [localFilter, setLocalFilter] = React.useState("")
  const [sel, setSel] = React.useState<Publicacao | null>(null)
  const [open, setOpen] = React.useState(false)
  const [ideasById, setIdeasById] = React.useState<Record<string, Ideia>>({})

  React.useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await bridge<any, unknown>("publicacoes", "list", {
          clienteId: cliente?.id ?? null,
          periodo,
        })
        if (!active) return
        const list = normalizePublicationsList(data)
        setItems(list)
      } catch {
        if (!active) return
        setItems([])
      }
    })()
    return () => {
      active = false
    }
  }, [cliente?.id, periodo])

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await bridge("ideias", "list", { clienteId: cliente?.id ?? null, periodo })
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
  }, [cliente?.id, periodo])

  const filtered = React.useMemo(() => {
    const q = (localFilter || search || "").toLowerCase().trim()
    if (!q) return items
    return items.filter((p) => [p.titulo, p.legenda].some((f) => (f ?? "").toLowerCase().includes(q)))
  }, [items, localFilter, search])

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

  function onCreated(p: Publicacao) {
    setItems((prev) => [p, ...prev])
  }

  async function onPublish(row: Publicacao) {
    const updated: Publicacao = { ...row, status: "publicada", data_postagem: isoNow() }
    setItems((prev) => prev.map((p) => (p.id === row.id ? updated : p)))
    try {
      const payload = buildPublicationUpdatePayload(updated)
      await bridge("publicacoes", "update", payload)
    } catch {
      setItems((prev) => prev.map((p) => (p.id === row.id ? row : p)))
    }
  }

  const getClienteNome = React.useCallback((id: string) => clientes.find((c) => c.id === id)?.nome ?? "—", [clientes])
  const getIdeaById = React.useCallback((id?: string | null) => (id ? (ideasById[id] ?? null) : null), [ideasById])

  return (
    <PageShell title="Social Media · Publicações">
      <div className="flex items-center gap-2 mb-3">
        <CreateFromIdeaDialog clienteId={cliente?.id ?? null} onCreated={onCreated} />
        <Button
          variant="outline"
          onClick={() => {
            /* export CSV aqui se quiser */
          }}
        >
          Exportar CSV
        </Button>
        <div className="ml-auto">
          <Input
            value={localFilter}
            onChange={(e) => setLocalFilter(e.target.value)}
            placeholder="Busca (título / legenda)..."
            className="max-w-xs"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">Sem publicações no período/cliente selecionado.</Card>
      ) : (
        <PubsCardList
          items={filtered}
          role={role}
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
