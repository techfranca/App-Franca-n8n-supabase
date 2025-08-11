"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [dataAprovacao, setDataAprovacao] = React.useState<string>("")
  const [dataPostagem, setDataPostagem] = React.useState<string>("")
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
      const dataAprovacaoISO = dataAprovacao
        ? new Date(dataAprovacao).toISOString()
        : data.data_aprovacao
          ? new Date(`${data.data_aprovacao}T00:00:00`).toISOString()
          : null
      const dataPostagemISO = dataPostagem
        ? new Date(dataPostagem).toISOString()
        : data.data_publicacao
          ? new Date(`${data.data_publicacao}T00:00:00`).toISOString()
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
        // NOVO: enviar status ao webhook
        status: fallbackStatus,
      }

      const res = await bridge<typeof payload, any>("ideias", "create", payload)
      const raw = asRow<any>(res)
      if (!raw) throw new Error("Resposta vazia ao criar a ideia")

      const row = normalizeIdea(raw, fallbackStatus)
      onCreated(row) // setItems(prev => [row, ...prev]) no componente pai
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
        <Button className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Ideia</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Cliente</Label>
            <Select
              value={(data.cliente_id as string) || ""}
              onValueChange={(v) => setData((d) => ({ ...d, cliente_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Título</Label>
            <Input value={data.titulo ?? ""} onChange={(e) => setData((d) => ({ ...d, titulo: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Plataforma</Label>
              <Select
                value={(data.plataforma as any) ?? "Instagram"}
                onValueChange={(v) => setData((d) => ({ ...d, plataforma: v as any }))}
              >
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
              <Select
                value={(data.formato as any) ?? "Reels"}
                onValueChange={(v) => setData((d) => ({ ...d, formato: v as any }))}
              >
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

          {data.formato === "Reels" && (
            <div className="grid gap-1.5">
              <Label>Roteiro</Label>
              <Textarea
                value={data.roteiro ?? ""}
                onChange={(e) => setData((d) => ({ ...d, roteiro: e.target.value }))}
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>Ideia</Label>
            <Textarea value={data.ideia ?? ""} onChange={(e) => setData((d) => ({ ...d, ideia: e.target.value }))} />
          </div>

          <div className="grid gap-1.5">
            <Label>Legenda</Label>
            <Textarea
              value={data.legenda ?? ""}
              onChange={(e) => setData((d) => ({ ...d, legenda: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Hashtags</Label>
              <Input
                value={data.hashtags ?? ""}
                onChange={(e) => setData((d) => ({ ...d, hashtags: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>CTA</Label>
              <Input value={data.cta ?? ""} onChange={(e) => setData((d) => ({ ...d, cta: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Objetivo</Label>
            <Textarea
              value={data.objetivo ?? ""}
              onChange={(e) => setData((d) => ({ ...d, objetivo: e.target.value }))}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Referência (URL)</Label>
            <Input
              value={data.referencia ?? ""}
              onChange={(e) => setData((d) => ({ ...d, referencia: e.target.value }))}
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
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Data e hora de Postagem</Label>
              <Input
                type="datetime-local"
                value={dataPostagem}
                onChange={(e) => setDataPostagem(e.target.value)}
                placeholder="YYYY-MM-DDTHH:mm"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => create("rascunho")} disabled={pending}>
              {pending ? "Salvando..." : "Salvar rascunho"}
            </Button>
            <Button
              className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]"
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
