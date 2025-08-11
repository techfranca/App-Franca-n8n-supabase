"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { bridge } from "@/lib/bridge"
import type { Ideia, Publicacao } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { toArray } from "../../../src/lib/toArray"
import { buildPublicationCreateFromIdeaPayload } from "@/lib/build-payload"
import { normalizePublication } from "@/lib/map-publication"

export function CreateFromIdeaDialog({
  clienteId,
  onCreated,
}: {
  clienteId: string | null
  onCreated: (p: Publicacao) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [ideias, setIdeias] = React.useState<Ideia[]>([])
  const { toast } = useToast()

  async function load() {
    try {
      const data = await bridge("ideias", "list_approved", { clienteId })
      setIdeias(toArray<Ideia>(data))
    } catch (err) {
      setIdeias([])
    }
  }

  React.useEffect(() => {
    if (open) load()
  }, [open])

  async function select(i: Ideia) {
    try {
      const payload = buildPublicationCreateFromIdeaPayload(i) // status inicial: em_design
      const res = await bridge("publicacoes", "create_from_idea", payload)
      const raw = (res as any)?.data ?? res
      const row = normalizePublication(raw)
      onCreated(row)
      setOpen(false)
      toast({ title: "Publicação criada a partir de ideia" })
    } catch (e: any) {
      toast({ title: "Falha ao criar publicação", description: e?.message || String(e), variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]">Criar a partir de Ideia</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ideias aprovadas</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ideias.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.titulo}</TableCell>
                  <TableCell>{i.plataforma}</TableCell>
                  <TableCell>{i.formato}</TableCell>
                  <TableCell>{i.status}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => select(i)}>
                      Selecionar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!ideias.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma ideia aprovada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
