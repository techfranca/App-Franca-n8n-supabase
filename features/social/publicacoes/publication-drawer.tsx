"use client"

import * as React from "react"
import type { Publicacao, Ideia, PublicacaoStatus } from "@/lib/types"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { bridge } from "@/lib/bridge"
import { Checkbox } from "@/components/ui/checkbox"
import { isoNow } from "@/lib/utils-date"
import { PUB_STATUS, nextPubStatusOnApprove, nextPubStatusOnReject } from "@/lib/status"
import { buildPublicationUpdatePayload } from "@/lib/build-payload"
import { Upload } from "lucide-react"
import { UploadMediaDialog } from "@/features/shared/upload-media-dialog"
import { cn } from "@/lib/utils"
import { publicUrlFromPath, uploadMediaFilesToSupabase } from "@/lib/supabase-client"

const formatos = ["Reels", "Carrossel", "Imagem única", "Stories", "Outro"]
const plataformas = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn"]

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  pub: Publicacao | null
  onUpdated: (p: Publicacao) => void
  onDeleted: (id: string) => void
  origemIdeia?: Ideia | null
}

export function PublicationDrawer({ open, onOpenChange, pub, onUpdated }: Props) {
  const { toast } = useToast()
  const [form, setForm] = React.useState<Publicacao | null>(pub)
  const [comment, setComment] = React.useState("")
  const [qa, setQa] = React.useState({ a: false, b: false, c: false })
  const [showUpload, setShowUpload] = React.useState(false)

  React.useEffect(() => {
    setForm(pub)
    setQa({ a: false, b: false, c: false })
    setComment("")
  }, [pub])

  if (!form) return null

  const set = <K extends keyof Publicacao>(k: K, v: Publicacao[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev))

  async function handleSave() {
    if (!form) return
    const payload = buildPublicationUpdatePayload(form)
    const res = await bridge<any, any>("publicacoes", "update", payload)
    if ((res as any)?.ok === false) {
      toast({ title: "Falha ao salvar", variant: "destructive" })
      return
    }
    toast({ title: "Publicação atualizada" })
    onUpdated({ ...form })
  }

  async function handleApprove() {
    if (!form) return
    const next = nextPubStatusOnApprove(form.status)
    const updated = { ...form, status: next }
    setForm(updated)
    const payload = buildPublicationUpdatePayload(updated)
    const res = await bridge<any, any>("publicacoes", "update", payload)
    if ((res as any)?.ok === false) {
      toast({ title: "Falha ao aprovar", variant: "destructive" })
      return
    }
    toast({ title: "Aprovação registrada" })
    onUpdated(updated)
  }

  async function handleReject() {
    if (!form) return
    if (!comment.trim()) {
      toast({ title: "Comentário é obrigatório ao reprovar", variant: "destructive" })
      return
    }
    const next = nextPubStatusOnReject(form.status)
    const updated = { ...form, status: next }
    setForm(updated)
    const payload = buildPublicationUpdatePayload(updated, { comentario: comment })
    const res = await bridge("publicacoes", "update", payload)
    if ((res as any)?.ok === false) {
      toast({ title: "Falha ao reprovar", variant: "destructive" })
      return
    }
    toast({ title: "Reprovada com comentário" })
    onUpdated(updated)
  }

  async function handleSchedule() {
    if (!form) return
    if (!(qa.a && qa.b && qa.c)) return
    const next: PublicacaoStatus = PUB_STATUS.AGENDADA
    const updated = { ...form, status: next, data_agendada: form.data_agendada ?? isoNow() }
    setForm(updated)
    const payload = buildPublicationUpdatePayload(updated)
    const res = await bridge<any, any>("publicacoes", "update", payload)
    if ((res as any)?.ok === false) {
      toast({ title: "Falha ao agendar", variant: "destructive" })
      return
    }
    toast({ title: "Marcada como Agendada" })
    onUpdated(updated)
  }

  async function handlePublish() {
    if (!form) return
    const next: PublicacaoStatus = PUB_STATUS.PUBLICADA
    const updated = { ...form, status: next, data_postagem: isoNow() }
    setForm(updated)
    const payload = buildPublicationUpdatePayload(updated)
    const res = await bridge<any, any>("publicacoes", "update", payload)
    if ((res as any)?.ok === false) {
      toast({ title: "Falha ao publicar", variant: "destructive" })
      return
    }
    toast({ title: "Marcada como Publicada" })
    onUpdated(updated)
  }

  async function upsertMedia(args: { newFiles: File[]; keptPaths: string[]; coverPath: string | null }) {
    if (!form) return
    const uploaded = args.newFiles.length ? await uploadMediaFilesToSupabase(args.newFiles, { folder: "uploads" }) : []
    const newPaths = uploaded.map((u) => u.path)
    const finalList = [...args.keptPaths, ...newPaths].slice(0, 10)
    const firstPath = finalList[0] ?? null
    const coverPath =
      args.coverPath && finalList.includes(args.coverPath) ? args.coverPath : (finalList.find((x) => !!x) ?? null)

    const updated: Publicacao = {
      ...form,
      midia_url: firstPath,
      midia_urls: finalList,
      cover_url: coverPath,
      status: "publicacao_em_aprovacao",
    }
    setForm(updated)
    const payload = buildPublicationUpdatePayload(updated)
    await bridge("publicacoes", "update", payload)
    toast({ title: "Mídias atualizadas — Publicação em aprovação do cliente" })
    onUpdated(updated)
  }

  const mainRel = form.cover_url || form.midia_url || (form.midia_urls?.[0] ?? null)
  const main = publicUrlFromPath(mainRel)
  const isVideo = (main || "").toLowerCase().match(/\.(mp4|mov|webm)(\?|#|$)/i)
  const thumbs = (form.midia_urls ?? (form.midia_url ? [form.midia_url] : [])).map((p) => publicUrlFromPath(p) || "")

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-between">
              Publicação · {form.titulo}
              <div className="flex gap-2">
                <Button onClick={handleSave} className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]">
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleApprove}>
                  Aprovar
                </Button>
                <Button variant="outline" onClick={handleSchedule} disabled={!(qa.a && qa.b && qa.c)}>
                  Agendada
                </Button>
                <Button variant="outline" onClick={handlePublish}>
                  Publicado
                </Button>
                <Button variant="destructive" onClick={handleReject}>
                  Reprovar
                </Button>
              </div>
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 grid gap-4 md:grid-cols-2">
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Título</Label>
                <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Plataforma</Label>
                  <Select value={form.plataforma} onValueChange={(v) => set("plataforma", v as any)}>
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
                  <Select value={form.formato} onValueChange={(v) => set("formato", v as any)}>
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
              </div>

              <div className="grid gap-1.5">
                <Label>Legenda</Label>
                <Textarea value={form.legenda ?? ""} onChange={(e) => set("legenda", e.target.value)} />
              </div>

              <div className="grid gap-1.5">
                <Label>Mídia</Label>
                <div className="rounded border p-2 bg-slate-50">
                  {!main ? (
                    <div className="text-xs text-muted-foreground">Sem mídia</div>
                  ) : isVideo ? (
                    <video src={main || ""} controls className="w-full rounded object-contain max-h-[320px]" />
                  ) : (
                    <img
                      src={
                        main ||
                        "/placeholder.svg?height=300&width=600&query=preview-da-midia-da-publicacao" ||
                        "/placeholder.svg"
                      }
                      alt="Mídia da publicação"
                      className="w-full rounded object-contain max-h-[320px]"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).src = "/placeholder.svg?height=300&width=600"
                      }}
                    />
                  )}
                  {thumbs.length > 0 && (
                    <div className="mt-2 grid grid-cols-5 gap-1">
                      {thumbs.slice(0, 10).map((u, i) => (
                        <div key={i} className={cn("rounded overflow-hidden border")}>
                          {u.toLowerCase().match(/\.(mp4|mov|webm)(\?|#|$)/i) ? (
                            <div className="text-[10px] text-center p-2">Vídeo</div>
                          ) : (
                            <img
                              src={u || "/placeholder.svg?height=80&width=80&query=miniatura-da-publicacao"}
                              alt={`thumb-${i}`}
                              className="w-full h-14 object-cover"
                              onError={(e) => {
                                ;(e.currentTarget as HTMLImageElement).src = "/placeholder.svg?height=80&width=80"
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 bg-transparent"
                    onClick={() => setShowUpload(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Upload/gerenciar mídias
                  </Button>
                  <span className="text-xs text-muted-foreground break-all">
                    {form.cover_url ? `Capa: ${form.cover_url}` : "Sem capa definida"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Data/Hora Agendada</Label>
                  <Input
                    value={form.data_agendada ?? ""}
                    onChange={(e) => set("data_agendada", e.target.value)}
                    placeholder="YYYY-MM-DDTHH:mm:ssZ"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Link Publicado</Label>
                  <Input
                    value={form.link_publicado ?? ""}
                    onChange={(e) => set("link_publicado", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>Comentário</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comentário (obrigatório para Reprovar)"
                />
              </div>

              <div className="grid gap-1">
                <Label>Checklist antes de Agendar</Label>
                <div className="flex items-center gap-2">
                  <Checkbox checked={qa.a} onCheckedChange={(v) => setQa((q) => ({ ...q, a: Boolean(v) }))} /> Revisado
                  por QA
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={qa.b} onCheckedChange={(v) => setQa((q) => ({ ...q, b: Boolean(v) }))} /> CTA
                  conferido
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={qa.c} onCheckedChange={(v) => setQa((q) => ({ ...q, c: Boolean(v) }))} />{" "}
                  Ortografia ok
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <UploadMediaDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        max={10}
        initial={{
          paths: form.midia_urls?.length ? form.midia_urls : form.midia_url ? [form.midia_url] : [],
          coverPath: form.cover_url ?? null,
        }}
        onUpsert={async ({ newFiles, keptPaths, coverPath }) => {
          await upsertMedia({ newFiles, keptPaths, coverPath })
        }}
      />
    </>
  )
}
