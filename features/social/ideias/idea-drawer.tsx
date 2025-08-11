"use client"

import * as React from "react"
import type { Ideia, Formato, Plataforma, AuthUser } from "@/lib/types"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { bridge } from "@/lib/bridge"
import { getUser } from "@/lib/auth-client"
import { Checkbox } from "@/components/ui/checkbox"
import { asRow } from "@/lib/as-row"
import { normalizeIdea } from "@/lib/map-idea"
import { IDEA_STATUS } from "@/lib/status"

const formatos: Formato[] = ["Reels", "Carrossel", "Imagem única", "Stories", "Outro"]
const plataformas: Plataforma[] = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn"]

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  ideia: Ideia | null
  onUpdated: (next: Ideia) => void
  onDeleted: (id: string) => void
}

export function IdeaDrawer({ open, onOpenChange, ideia, onUpdated, onDeleted }: Props) {
  const { toast } = useToast()
  const [form, setForm] = React.useState<Ideia | null>(ideia)
  const user = React.useMemo<AuthUser | null>(() => getUser(), [])

  const [dataAprovacao, setDataAprovacao] = React.useState<string>("")
  const [dataPostagem, setDataPostagem] = React.useState<string>("")

  React.useEffect(() => {
    setForm(ideia)
    if (ideia?.data_aprovacao) setDataAprovacao(`${ideia.data_aprovacao}T00:00`)
    else setDataAprovacao("")
    if (ideia?.data_publicacao) setDataPostagem(`${ideia.data_publicacao}T00:00`)
    else setDataPostagem("")
  }, [ideia])

  if (!form) return null

  const canEdit = user?.role === "admin" || user?.role === "colaborador"
  const set = <K extends keyof Ideia>(k: K, v: Ideia[K]) => setForm((prev) => (prev ? { ...prev, [k]: v } : prev))

  async function handleSave() {
    try {
      const dataAprovacaoISO = dataAprovacao
        ? new Date(dataAprovacao).toISOString()
        : form.data_aprovacao
          ? new Date(`${form.data_aprovacao}T00:00:00`).toISOString()
          : null
      const dataPostagemISO = dataPostagem
        ? new Date(dataPostagem).toISOString()
        : form.data_publicacao
          ? new Date(`${form.data_publicacao}T00:00:00`).toISOString()
          : null

      const payload = {
        id: form.id,
        cliente_id: form.cliente_id,
        titulo: form.titulo,
        plataforma: form.plataforma,
        formato: form.formato,
        ideia: form.ideia,
        objetivo: form.objetivo ?? "",
        cta: form.cta ?? "",
        roteiro: form.roteiro ?? "",
        legenda: form.legenda ?? "",
        hashtags: form.hashtags ?? "",
        referencia: form.referencia ?? "",
        dataAprovacao: dataAprovacaoISO,
        dataPostagem: dataPostagemISO,
        status: form.status,
        needs_reapproval: !!form.needs_reapproval,
      }

      const res = await bridge<typeof payload, any>("ideias", "update", payload)
      const raw = asRow<any>(res)
      const row = raw ? normalizeIdea(raw, form.status) : { ...form }
      onUpdated(row)
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar",
        description: err?.message ?? "Não foi possível salvar as alterações.",
        variant: "destructive",
      })
    }
  }

  async function handleResendForApproval() {
    try {
      // Atualiza campos e envia status "ideia_em_aprovacao" de volta ao webhook
      const payload = {
        id: form.id,
        cliente_id: form.cliente_id,
        titulo: form.titulo,
        plataforma: form.plataforma,
        formato: form.formato,
        ideia: form.ideia,
        objetivo: form.objetivo ?? "",
        cta: form.cta ?? "",
        roteiro: form.roteiro ?? "",
        legenda: form.legenda ?? "",
        hashtags: form.hashtags ?? "",
        referencia: form.referencia ?? "",
        dataAprovacao: form.data_aprovacao ? new Date(`${form.data_aprovacao}T00:00:00`).toISOString() : null,
        dataPostagem: form.data_publicacao ? new Date(`${form.data_publicacao}T00:00:00`).toISOString() : null,
        status: IDEA_STATUS.EM_APROVACAO,
        needs_reapproval: false,
      }
      const res = await bridge("ideias", "update", payload)
      const raw = asRow<any>(res)
      const row = raw ? normalizeIdea(raw, "ideia_em_aprovacao") : { ...form, status: "ideia_em_aprovacao" }
      onUpdated(row)
      toast({ title: "Ideia enviada novamente para aprovação" })
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "Falha ao reenviar",
        description: err?.message || String(err),
        variant: "destructive",
      })
    }
  }

  async function handleDelete() {
    try {
      await bridge("ideias", "delete", { id: form.id })
      toast({ title: "Ideia excluída" })
      onDeleted(form.id)
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err?.message || String(err), variant: "destructive" })
    }
  }

  const showRoteiro = form.formato === "Reels"
  const showResendButton = canEdit && (form.status === "ideia_em_alteracao" || form.needs_reapproval)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            Ideia · {form.titulo}
            <div className="flex gap-2">
              {canEdit && (
                <>
                  <Button onClick={handleSave} className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]">
                    Atualizar
                  </Button>
                  {showResendButton && (
                    <Button variant="outline" onClick={handleResendForApproval} title="Atualiza e envia para aprovação">
                      Atualizar e reenviar para aprovação
                    </Button>
                  )}
                  <Button variant="destructive" onClick={handleDelete}>
                    Excluir
                  </Button>
                </>
              )}
            </div>
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} readOnly={!canEdit} />
            </div>
            <div className="grid gap-1.5">
              <Label>Referência (URL)</Label>
              <Input
                value={form.referencia ?? ""}
                onChange={(e) => set("referencia", e.target.value)}
                readOnly={!canEdit}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Plataforma</Label>
              <Select value={form.plataforma} onValueChange={(v) => set("plataforma", v as any)} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plataformas.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Formato</Label>
              <Select value={form.formato} onValueChange={(v) => set("formato", v as any)} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatos.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showRoteiro && (
              <div className="grid gap-1.5">
                <Label>Roteiro (obrigatório para Reels)</Label>
                <Textarea
                  value={form.roteiro ?? ""}
                  onChange={(e) => set("roteiro", e.target.value)}
                  readOnly={!canEdit}
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Hashtags</Label>
              <Input
                value={form.hashtags ?? ""}
                onChange={(e) => set("hashtags", e.target.value)}
                readOnly={!canEdit}
              />
            </div>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Ideia</Label>
              <Textarea value={form.ideia} onChange={(e) => set("ideia", e.target.value)} readOnly={!canEdit} />
            </div>
            <div className="grid gap-1.5">
              <Label>Objetivo</Label>
              <Textarea
                value={form.objetivo ?? ""}
                onChange={(e) => set("objetivo", e.target.value)}
                readOnly={!canEdit}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>CTA</Label>
              <Input value={form.cta ?? ""} onChange={(e) => set("cta", e.target.value)} readOnly={!canEdit} />
            </div>
            <div className="grid gap-1.5">
              <Label>Legenda</Label>
              <Textarea
                value={form.legenda ?? ""}
                onChange={(e) => set("legenda", e.target.value)}
                readOnly={!canEdit}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Data e hora de Aprovação</Label>
                <Input
                  type="datetime-local"
                  value={dataAprovacao}
                  onChange={(e) => setDataAprovacao(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:mm"
                  readOnly={!canEdit}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Data e hora de Postagem</Label>
                <Input
                  type="datetime-local"
                  value={dataPostagem}
                  onChange={(e) => setDataPostagem(e.target.value)}
                  placeholder="YYYY-MM-DDTHH:mm"
                  readOnly={!canEdit}
                />
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reapproval"
                  checked={!!form.needs_reapproval}
                  onCheckedChange={(v) => set("needs_reapproval", Boolean(v))}
                />
                <Label htmlFor="reapproval">Enviar novamente para aprovação do cliente?</Label>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
