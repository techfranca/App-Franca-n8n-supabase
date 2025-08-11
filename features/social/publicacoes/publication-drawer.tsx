"use client"

import * as React from "react"
import type { Publicacao, Ideia, PublicacaoStatus } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

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

  const [dataAgendada, setDataAgendada] = React.useState<Date>()
  const [horaAgendada, setHoraAgendada] = React.useState<string>("")

  React.useEffect(() => {
    setForm(pub)
    setQa({ a: false, b: false, c: false })
    setComment("")

    if (pub?.data_agendada) {
      const date = new Date(pub.data_agendada)
      setDataAgendada(date)
      setHoraAgendada(format(date, "HH:mm"))
    } else {
      setDataAgendada(undefined)
      setHoraAgendada("")
    }
  }, [pub])

  if (!form) return null

  const set = <K extends keyof Publicacao>(k: K, v: Publicacao[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev))

  async function handleSave() {
    if (!form) return

    const dataAgendadaISO =
      dataAgendada && horaAgendada
        ? new Date(`${format(dataAgendada, "yyyy-MM-dd")}T${horaAgendada}:00`).toISOString()
        : null

    const updatedForm = { ...form, data_agendada: dataAgendadaISO }
    setForm(updatedForm)

    const payload = buildPublicationUpdatePayload(updatedForm)
    const res = await bridge<any, any>("publicacoes", "update", payload)
    if ((res as any)?.ok === false) {
      toast({ title: "Falha ao salvar", variant: "destructive" })
      return
    }
    toast({ title: "Publicação atualizada" })
    onUpdated(updatedForm)
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold mb-2 text-[#081534]">
              Editar Publicação · {form.titulo}
            </DialogTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSave}
                className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655] text-sm px-4 font-sans"
              >
                Salvar
              </Button>
              <Button variant="outline" onClick={handleApprove} className="text-sm px-4 bg-transparent font-sans">
                Aprovar
              </Button>
              <Button
                variant="outline"
                onClick={handleSchedule}
                disabled={!(qa.a && qa.b && qa.c)}
                className="text-sm px-4 bg-transparent font-sans"
              >
                Agendada
              </Button>
              <Button variant="outline" onClick={handlePublish} className="text-sm px-4 bg-transparent font-sans">
                Publicado
              </Button>
              <Button variant="destructive" onClick={handleReject} className="text-sm px-4 font-sans">
                Reprovar
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Seção: Informações Básicas */}
            <div className="border border-gray-200 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-[#081534] mb-3 text-sm">Informações Básicas</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#081534]">Título</Label>
                  <Input
                    className="h-11 text-sm w-full font-sans font-bold"
                    value={form.titulo}
                    onChange={(e) => set("titulo", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#081534]">Link Publicado</Label>
                  <Input
                    className="h-11 text-sm w-full font-sans font-bold"
                    value={form.link_publicado ?? ""}
                    onChange={(e) => set("link_publicado", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#081534]">Plataforma</Label>
                  <Select value={form.plataforma} onValueChange={(v) => set("plataforma", v as any)}>
                    <SelectTrigger className="h-11 text-sm w-full font-sans font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-sans">
                      {plataformas.map((p) => (
                        <SelectItem key={p} value={p} className="text-sm font-sans font-bold">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#081534]">Formato</Label>
                  <Select value={form.formato} onValueChange={(v) => set("formato", v as any)}>
                    <SelectTrigger className="h-11 text-sm w-full font-sans font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-sans">
                      {formatos.map((f) => (
                        <SelectItem key={f} value={f} className="text-sm font-sans font-bold">
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Seção: Conteúdo */}
            <div className="border border-gray-200 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-[#081534] mb-3 text-sm">Conteúdo</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#081534]">Legenda</Label>
                  <Textarea
                    className="min-h-[100px] resize-none text-sm w-full font-sans font-bold"
                    value={form.legenda ?? ""}
                    onChange={(e) => set("legenda", e.target.value)}
                    placeholder="Escreva a legenda..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#081534]">Mídia</Label>
                  <div className="rounded border p-4 bg-slate-50">
                    {!main ? (
                      <div className="text-sm text-muted-foreground text-center py-8">Sem mídia</div>
                    ) : isVideo ? (
                      <video src={main || ""} controls className="w-full rounded object-contain max-h-[280px]" />
                    ) : (
                      <img
                        src={main || "/placeholder.svg?height=300&width=600&query=preview-da-midia-da-publicacao"}
                        alt="Mídia da publicação"
                        className="w-full rounded object-contain max-h-[280px]"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src = "/placeholder.svg?height=300&width=600"
                        }}
                      />
                    )}
                    {thumbs.length > 0 && (
                      <div className="mt-4 grid grid-cols-5 gap-2">
                        {thumbs.slice(0, 10).map((u, i) => (
                          <div key={i} className={cn("rounded overflow-hidden border")}>
                            {u.toLowerCase().match(/\.(mp4|mov|webm)(\?|#|$)/i) ? (
                              <div className="text-xs text-center p-2 bg-gray-100">Vídeo</div>
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
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 text-sm h-11 bg-transparent font-sans"
                      onClick={() => setShowUpload(true)}
                    >
                      <Upload className="h-4 w-4" />
                      Editar mídia
                    </Button>
                    <span className="text-xs text-muted-foreground break-all">
                      {form.cover_url ? `Capa: ${form.cover_url}` : "Sem capa definida"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção: Agendamento e QA */}
            <div className="border border-gray-200 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-[#081534] mb-3 text-sm">Agendamento e Qualidade</h3>

              {/* Data Agendada */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-[#081534]">Data e Hora Agendada</Label>
                <div className="flex flex-col gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-sm h-11 font-sans",
                          !dataAgendada && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {dataAgendada ? format(dataAgendada, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start" side="bottom" sideOffset={8}>
                      <Calendar
                        mode="single"
                        selected={dataAgendada}
                        onSelect={setDataAgendada}
                        initialFocus
                        locale={ptBR}
                        className="rounded-md border shadow-lg bg-white font-sans"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative">
                    <Input
                      type="time"
                      className="w-full text-sm h-11 pr-10 font-sans font-bold"
                      value={horaAgendada}
                      onChange={(e) => setHoraAgendada(e.target.value)}
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Comentário</Label>
                <Textarea
                  className="min-h-[80px] resize-none text-sm w-full font-sans font-bold"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comentário (obrigatório para Reprovar)"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-[#081534]">Checklist antes de Agendar</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={qa.a} onCheckedChange={(v) => setQa((q) => ({ ...q, a: Boolean(v) }))} />
                    <span className="text-sm">Revisado por QA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={qa.b} onCheckedChange={(v) => setQa((q) => ({ ...q, b: Boolean(v) }))} />
                    <span className="text-sm">CTA conferido</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={qa.c} onCheckedChange={(v) => setQa((q) => ({ ...q, c: Boolean(v) }))} />
                    <span className="text-sm">Ortografia ok</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
