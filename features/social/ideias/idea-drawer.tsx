"use client"

import * as React from "react"
import type { Ideia, Formato, Plataforma, AuthUser } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

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

  const [dataAprovacao, setDataAprovacao] = React.useState<Date>()
  const [horaAprovacao, setHoraAprovacao] = React.useState<string>("")
  const [dataPostagem, setDataPostagem] = React.useState<Date>()
  const [horaPostagem, setHoraPostagem] = React.useState<string>("")

  React.useEffect(() => {
    setForm(ideia)
    if (ideia?.data_aprovacao) {
      const date = new Date(ideia.data_aprovacao)
      setDataAprovacao(date)
      setHoraAprovacao(format(date, "HH:mm"))
    } else {
      setDataAprovacao(undefined)
      setHoraAprovacao("")
    }
    if (ideia?.data_publicacao) {
      const date = new Date(ideia.data_publicacao)
      setDataPostagem(date)
      setHoraPostagem(format(date, "HH:mm"))
    } else {
      setDataPostagem(undefined)
      setHoraPostagem("")
    }
  }, [ideia])

  if (!form) return null

  const canEdit = user?.role === "admin" || user?.role === "colaborador"
  const set = <K extends keyof Ideia>(k: K, v: Ideia[K]) => setForm((prev) => (prev ? { ...prev, [k]: v } : prev))

  async function handleSave() {
    try {
      const dataAprovacaoISO =
        dataAprovacao && horaAprovacao
          ? new Date(`${format(dataAprovacao, "yyyy-MM-dd")}T${horaAprovacao}:00`).toISOString()
          : null
      const dataPostagemISO =
        dataPostagem && horaPostagem
          ? new Date(`${format(dataPostagem, "yyyy-MM-dd")}T${horaPostagem}:00`).toISOString()
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
      toast({ title: "Ideia atualizada" })
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto font-sans">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center justify-between text-xl font-semibold text-[#081534]">
            Editar Ideia · {form.titulo}
            <div className="flex gap-2">
              {canEdit && (
                <>
                  <Button
                    onClick={handleSave}
                    className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655] text-sm px-6 font-sans"
                  >
                    Atualizar
                  </Button>
                  {showResendButton && (
                    <Button
                      variant="outline"
                      onClick={handleResendForApproval}
                      title="Atualiza e envia para aprovação"
                      className="text-sm px-6 bg-transparent font-sans"
                    >
                      Atualizar e reenviar para aprovação
                    </Button>
                  )}
                  <Button variant="destructive" onClick={handleDelete} className="text-sm px-6 font-sans">
                    Excluir
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Seção: Informações Básicas */}
          <div className="border border-gray-200 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-[#081534] mb-3 text-sm">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Título</Label>
                <Input
                  className="h-11 text-sm font-sans font-bold"
                  value={form.titulo}
                  onChange={(e) => set("titulo", e.target.value)}
                  readOnly={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Referência (URL)</Label>
                <Input
                  className="h-11 text-sm font-sans font-bold"
                  value={form.referencia ?? ""}
                  onChange={(e) => set("referencia", e.target.value)}
                  readOnly={!canEdit}
                  placeholder="https://exemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Plataforma</Label>
                <Select value={form.plataforma} onValueChange={(v) => set("plataforma", v as any)} disabled={!canEdit}>
                  <SelectTrigger className="h-11 text-sm font-sans font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <Select value={form.formato} onValueChange={(v) => set("formato", v as any)} disabled={!canEdit}>
                  <SelectTrigger className="h-11 text-sm font-sans font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formatos.map((f) => (
                      <SelectItem key={f} value={f} className="text-sm font-sans font-bold">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">CTA</Label>
                <Input
                  className="h-11 text-sm font-sans font-bold"
                  value={form.cta ?? ""}
                  onChange={(e) => set("cta", e.target.value)}
                  readOnly={!canEdit}
                  placeholder="Call to action"
                />
              </div>
            </div>
          </div>

          {/* Seção: Conteúdo */}
          <div className="border border-gray-200 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-[#081534] mb-3 text-sm">Conteúdo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Ideia</Label>
                <Textarea
                  className="min-h-[100px] resize-none text-sm font-sans font-bold"
                  value={form.ideia}
                  onChange={(e) => set("ideia", e.target.value)}
                  readOnly={!canEdit}
                  placeholder="Descreva sua ideia..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Legenda</Label>
                <Textarea
                  className="min-h-[100px] resize-none text-sm font-sans font-bold"
                  value={form.legenda ?? ""}
                  onChange={(e) => set("legenda", e.target.value)}
                  readOnly={!canEdit}
                  placeholder="Escreva a legenda..."
                />
              </div>
            </div>

            {showRoteiro && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Roteiro</Label>
                <Textarea
                  className="min-h-[80px] resize-none text-sm font-sans font-bold"
                  value={form.roteiro ?? ""}
                  onChange={(e) => set("roteiro", e.target.value)}
                  readOnly={!canEdit}
                  placeholder="Descreva o roteiro do Reels..."
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Hashtags</Label>
                <Input
                  className="h-11 text-sm font-sans font-bold"
                  value={form.hashtags ?? ""}
                  onChange={(e) => set("hashtags", e.target.value)}
                  readOnly={!canEdit}
                  placeholder="#hashtag1 #hashtag2"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Objetivo</Label>
                <Textarea
                  className="min-h-[80px] resize-none text-sm font-sans font-bold"
                  value={form.objetivo ?? ""}
                  onChange={(e) => set("objetivo", e.target.value)}
                  readOnly={!canEdit}
                  placeholder="Qual o objetivo desta ideia?"
                />
              </div>
            </div>
          </div>

          {/* Seção: Agendamento */}
          <div className="border border-gray-200 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-[#081534] mb-3 text-sm">Agendamento</h3>
            <div className="space-y-6">
              {/* Data de Aprovação */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-[#081534]">Data e Hora de Aprovação</Label>
                <div className="flex flex-col gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-sm h-11 font-sans font-bold",
                          !dataAprovacao && "text-muted-foreground",
                        )}
                        disabled={!canEdit}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {dataAprovacao ? format(dataAprovacao, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start" side="bottom" sideOffset={8}>
                      <Calendar
                        mode="single"
                        selected={dataAprovacao}
                        onSelect={setDataAprovacao}
                        initialFocus
                        locale={ptBR}
                        className="rounded-md border shadow-lg bg-white"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative">
                    <Input
                      type="time"
                      className="w-full text-sm h-11 pr-10 font-sans font-bold"
                      value={horaAprovacao}
                      onChange={(e) => setHoraAprovacao(e.target.value)}
                      readOnly={!canEdit}
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Data de Postagem */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-[#081534]">Data e Hora de Postagem</Label>
                <div className="flex flex-col gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-sm h-11 font-sans font-bold",
                          !dataPostagem && "text-muted-foreground",
                        )}
                        disabled={!canEdit}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {dataPostagem ? format(dataPostagem, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start" side="bottom" sideOffset={8}>
                      <Calendar
                        mode="single"
                        selected={dataPostagem}
                        onSelect={setDataPostagem}
                        initialFocus
                        locale={ptBR}
                        className="rounded-md border shadow-lg bg-white"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative">
                    <Input
                      type="time"
                      className="w-full text-sm h-11 pr-10 font-sans font-bold"
                      value={horaPostagem}
                      onChange={(e) => setHoraPostagem(e.target.value)}
                      readOnly={!canEdit}
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2 pt-4 border-t">
                <Checkbox
                  id="reapproval"
                  checked={!!form.needs_reapproval}
                  onCheckedChange={(v) => set("needs_reapproval", Boolean(v))}
                />
                <Label htmlFor="reapproval" className="text-sm font-sans">
                  Enviar novamente para aprovação do cliente?
                </Label>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
