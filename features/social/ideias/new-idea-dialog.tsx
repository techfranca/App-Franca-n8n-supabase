"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { Formato, Plataforma, Ideia, AuthUser, IdeiaStatus } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { bridge } from "@/lib/bridge"
import { getUser } from "@/lib/auth-client"
import { useClientes } from "@/stores/app-state"
import { asRow } from "@/lib/as-row"
import { normalizeIdea } from "@/lib/map-idea"

const formatos: Formato[] = ["Reels", "Carrossel", "Imagem única", "Stories", "Outro"]
const plataformas: Plataforma[] = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn"]

export function NewIdeaDialog({
  clienteId,
  onCreated,
  triggerLabel = "Nova Ideia",
}: {
  clienteId: string | null
  onCreated: (i: Ideia) => void
  triggerLabel?: string
}) {
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [data, setData] = React.useState<Partial<Ideia>>({
    cliente_id: clienteId ?? "",
    titulo: "",
    referencia: "",
    plataforma: "Instagram",
    hashtags: "",
    formato: "Reels",
    ideia: "",
    objetivo: "",
    cta: "",
    roteiro: "",
    legenda: "",
    status: "rascunho",
  } as any)

  const [dataAprovacao, setDataAprovacao] = React.useState<Date>()
  const [horaAprovacao, setHoraAprovacao] = React.useState<string>("")
  const [dataPostagem, setDataPostagem] = React.useState<Date>()
  const [horaPostagem, setHoraPostagem] = React.useState<string>("")

  const user = getUser() as AuthUser | null
  const isCliente = user?.role === "cliente"
  const clientes = useClientes()
  const [pending, setPending] = React.useState<boolean>(false)

  React.useEffect(() => {
    setData((d) => ({ ...d, cliente_id: clienteId ?? "" }))
  }, [clienteId])

  async function create(fallbackStatus: IdeiaStatus) {
    if (!data.titulo || !data.cliente_id) {
      toast({ title: "Preencha Título e selecione um Cliente", variant: "destructive" })
      return
    }
    setPending(true)
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
        cliente_id: data.cliente_id ?? "",
        titulo: data.titulo ?? "",
        plataforma: (data.plataforma as Plataforma) ?? "Instagram",
        formato: (data.formato as Formato) ?? "Reels",
        ideia: data.ideia ?? "",
        objetivo: data.objetivo ?? "",
        cta: data.cta ?? "",
        roteiro: data.roteiro ?? "",
        legenda: data.legenda ?? "",
        hashtags: data.hashtags ?? "",
        referencia: data.referencia ?? "",
        dataAprovacao: dataAprovacaoISO,
        dataPostagem: dataPostagemISO,
        status: fallbackStatus,
      }

      const res = await bridge<typeof payload, any>("ideias", "create", payload)
      const raw = asRow<any>(res)
      if (!raw) throw new Error("Resposta vazia ao criar a ideia")

      const row = normalizeIdea(raw, fallbackStatus)
      onCreated(row)
      toast({ title: "Ideia salva" })
      setOpen(false)
    } catch (err: any) {
      toast({
        title: "Erro ao criar",
        description: err?.message ?? "Não foi possível salvar a ideia.",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655] font-montserrat text-sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto font-montserrat">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-[#081534]">Nova Ideia</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção: Informações Básicas */}
          <div className="border border-gray-200 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-[#081534] mb-3 text-sm">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Cliente *</Label>
                <Select
                  value={(data.cliente_id as string) || ""}
                  onValueChange={(v) => setData((d) => ({ ...d, cliente_id: v }))}
                >
                  <SelectTrigger className="h-11 text-sm font-montserrat font-bold">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="font-montserrat">
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm font-montserrat font-bold">
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Título *</Label>
                <Input
                  className="h-11 text-sm font-montserrat font-bold"
                  value={data.titulo ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, titulo: e.target.value }))}
                  placeholder="Digite o título da ideia"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Plataforma</Label>
                <Select
                  value={(data.plataforma as any) ?? "Instagram"}
                  onValueChange={(v) => setData((d) => ({ ...d, plataforma: v as any }))}
                >
                  <SelectTrigger className="h-11 text-sm font-montserrat font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-montserrat">
                    {plataformas.map((p) => (
                      <SelectItem key={p} value={p} className="text-sm font-montserrat font-bold">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Formato</Label>
                <Select
                  value={(data.formato as any) ?? "Reels"}
                  onValueChange={(v) => setData((d) => ({ ...d, formato: v as any }))}
                >
                  <SelectTrigger className="h-11 text-sm font-montserrat font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-montserrat">
                    {formatos.map((f) => (
                      <SelectItem key={f} value={f} className="text-sm font-montserrat font-bold">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">CTA</Label>
                <Input
                  className="h-11 text-sm font-montserrat font-bold"
                  value={data.cta ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, cta: e.target.value }))}
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
                  className="min-h-[100px] resize-none text-sm font-montserrat font-bold"
                  value={data.ideia ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, ideia: e.target.value }))}
                  placeholder="Descreva sua ideia..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Legenda</Label>
                <Textarea
                  className="min-h-[100px] resize-none text-sm font-montserrat font-bold"
                  value={data.legenda ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, legenda: e.target.value }))}
                  placeholder="Escreva a legenda..."
                />
              </div>
            </div>

            {data.formato === "Reels" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Roteiro</Label>
                <Textarea
                  className="min-h-[80px] resize-none text-sm font-montserrat font-bold"
                  value={data.roteiro ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, roteiro: e.target.value }))}
                  placeholder="Descreva o roteiro do Reels..."
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Hashtags</Label>
                <Input
                  className="h-11 text-sm font-montserrat font-bold"
                  value={data.hashtags ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, hashtags: e.target.value }))}
                  placeholder="#hashtag1 #hashtag2"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#081534]">Referência (URL)</Label>
                <Input
                  className="h-11 text-sm font-montserrat font-bold"
                  value={data.referencia ?? ""}
                  onChange={(e) => setData((d) => ({ ...d, referencia: e.target.value }))}
                  placeholder="https://exemplo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#081534]">Objetivo</Label>
              <Textarea
                className="min-h-[80px] resize-none text-sm font-montserrat font-bold"
                value={data.objetivo ?? ""}
                onChange={(e) => setData((d) => ({ ...d, objetivo: e.target.value }))}
                placeholder="Qual o objetivo desta ideia?"
              />
            </div>
          </div>

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
                          "w-full justify-start text-left font-normal text-sm font-montserrat font-bold",
                          !dataAprovacao && "text-muted-foreground",
                        )}
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
                        className="rounded-md border shadow-lg bg-white font-montserrat"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative">
                    <Input
                      type="time"
                      className="w-full text-sm h-11 pr-10 font-montserrat font-bold"
                      value={horaAprovacao}
                      onChange={(e) => setHoraAprovacao(e.target.value)}
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
                          "w-full justify-start text-left font-normal text-sm font-montserrat font-bold",
                          !dataPostagem && "text-muted-foreground",
                        )}
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
                        className="rounded-md border shadow-lg bg-white font-montserrat"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative">
                    <Input
                      type="time"
                      className="w-full text-sm h-11 pr-10 font-montserrat font-bold"
                      value={horaPostagem}
                      onChange={(e) => setHoraPostagem(e.target.value)}
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => create("rascunho")}
              disabled={pending}
              className="px-6 text-sm font-montserrat"
            >
              {pending ? "Salvando..." : "Salvar rascunho"}
            </Button>
            <Button
              className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655] px-6 text-sm font-montserrat"
              onClick={() => create(isCliente ? "rascunho" : "ideia_em_aprovacao")}
              disabled={pending}
            >
              {pending ? "Enviando..." : isCliente ? "Sugerir Ideia" : "Criar & Enviar para aprovação"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
