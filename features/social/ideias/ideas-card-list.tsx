"use client"

import * as React from "react"
import type { Ideia, UserRole } from "@/lib/types"
import { PlatformIcon } from "@/features/shared/platform-icon"
import { StatusBadge } from "@/features/shared/status-badge"
import { CalendarDays, MessageSquare, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { bridge } from "@/lib/bridge"

export function IdeasCardList({
  items,
  getClienteNome,
  role = "admin",
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  items: Ideia[]
  getClienteNome: (clienteId: string) => string
  role?: UserRole
  onEdit?: (item: Ideia) => void
  onDelete?: (item: Ideia) => void
  onApprove?: (item: Ideia, comment?: string) => void
  onReject?: (item: Ideia, comment?: string) => void
}) {
  const [comments, setComments] = React.useState<Record<string, string>>({})
  const [showAllComments, setShowAllComments] = React.useState<Record<string, boolean>>({})
  const { toast } = useToast()

  const isClient = role === "cliente"
  const canEdit = role === "admin" || role === "colaborador"
  const canSeeComments = !isClient

  // Confirmação dupla
  const [delTarget, setDelTarget] = React.useState<Ideia | null>(null)
  const [confirmStep, setConfirmStep] = React.useState<0 | 1 | 2>(0)
  const [confirmTitle, setConfirmTitle] = React.useState<string>("")

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => {
          const dataPost = i.data_publicacao ?? ""
          const comentarios = i.comentarios ?? []
          const comentariosCount = comentarios.length
          const cliente = i.cliente_nome ?? getClienteNome(i.cliente_id)
          const comment = comments[i.id] ?? ""
          const showModeration =
            isClient &&
            (i.status === "ideia_em_aprovacao" || (i.status === "ideia_em_alteracao" && !!i.needs_reapproval))

          const borderCls = cn(
            "relative rounded-lg border shadow-sm p-4 bg-white transition-colors",
            i.status === "ideia_em_alteracao" && "border-orange-400",
            i.status === "em_design" && "border-emerald-400",
          )

          const showAll = !!showAllComments[i.id]
          const lastComment = comentariosCount > 0 ? comentarios[comentariosCount - 1] : null

          return (
            <div key={i.id} className={borderCls}>
              {canEdit && (onEdit || onDelete) ? (
                <div className="absolute top-2 right-2 flex gap-2">
                  {onEdit && (
                    <Button size="icon" variant="outline" onClick={() => onEdit(i)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => {
                        setDelTarget(i)
                        setConfirmStep(1)
                        setConfirmTitle("")
                      }}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : null}

              <div className="flex items-center gap-2 mb-2">
                <PlatformIcon platform={i.plataforma} className="h-5 w-5 text-[#4b8655]" />
                <span className="text-xs rounded bg-slate-100 px-2 py-0.5">{i.formato}</span>
              </div>

              <div className="text-base font-semibold mb-1">{i.titulo}</div>
              <div className="text-xs text-muted-foreground mb-2">{cliente}</div>

              <div className="mb-2">
                <StatusBadge status={i.status} map="ideia" />
              </div>

              <div className="text-sm mb-2">
                <div className="font-medium">Ideia</div>
                <div className="text-muted-foreground font-bold">{i.ideia || "—"}</div>
              </div>

              {i.formato === "Reels" && i.roteiro ? (
                <div className="text-sm mb-2">
                  <div className="font-medium">Roteiro</div>
                  <div className="text-muted-foreground whitespace-pre-wrap font-bold">{i.roteiro}</div>
                </div>
              ) : null}

              <div className="text-sm mb-2">
                <div className="font-medium">Legenda</div>
                <div className="text-muted-foreground font-bold">{i.legenda || "—"}</div>
              </div>

              {canSeeComments && comentariosCount > 0 ? (
                <div className="mb-2 rounded border bg-slate-50 p-2">
                  {!showAll ? (
                    <div className="text-xs">
                      <div className="mb-1 text-muted-foreground">
                        <span className="font-medium">{lastComment?.autor || "Comentário"}</span>{" "}
                        <span>
                          {lastComment?.created_at
                            ? "— " + new Date(lastComment.created_at).toLocaleString("pt-BR")
                            : ""}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap">{lastComment?.texto || ""}</div>
                      {comentariosCount > 1 ? (
                        <div className="mt-2">
                          <button
                            type="button"
                            className="text-[#4b8655] text-xs underline"
                            onClick={() => setShowAllComments((m) => ({ ...m, [i.id]: true }))}
                          >
                            Ver todos ({comentariosCount})
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-xs space-y-2">
                      {comentarios.map((c, idx) => (
                        <div key={idx} className="rounded border bg-white p-2">
                          <div className="mb-1 text-muted-foreground">
                            <span className="font-medium">{c.autor || "Comentário"}</span>{" "}
                            <span>{c.created_at ? "— " + new Date(c.created_at).toLocaleString("pt-BR") : ""}</span>
                          </div>
                          <div className="whitespace-pre-wrap">{c.texto || ""}</div>
                        </div>
                      ))}
                      <div className="pt-1">
                        <button
                          type="button"
                          className="text-[#4b8655] text-xs underline"
                          onClick={() => setShowAllComments((m) => ({ ...m, [i.id]: false }))}
                        >
                          Ocultar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="grid gap-2 mb-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Data de aprovação:</span>
                  <span className="text-muted-foreground">{i.data_aprovacao || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Data de postagem:</span>
                  <span className="text-muted-foreground">{i.data_publicacao || "Sem data"}</span>
                </div>
                {i.referencia ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Referência:</span>
                    <a
                      href={String(i.referencia)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4b8655] underline break-all"
                    >
                      {String(i.referencia)}
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>{dataPost || "Sem data"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{comentariosCount}</span>
                </div>
              </div>

              {showModeration ? (
                <div className="mt-3 grid gap-2">
                  <Textarea
                    className="font-bold"
                    placeholder="Comentário (obrigatório para reprovar)"
                    value={comment}
                    onChange={(e) => setComments((c) => ({ ...c, [i.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]"
                      onClick={() => onApprove?.(i, comment)}
                    >
                      Aprovado
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (!comment.trim()) {
                          toast({ title: "Comentário é obrigatório para reprovar.", variant: "destructive" })
                          return
                        }
                        onReject?.(i, comment)
                      }}
                    >
                      Não aprovado
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Confirmação dupla de exclusão */}
      <Dialog
        open={!!delTarget && confirmStep === 1}
        onOpenChange={(o) => {
          if (!o) {
            setDelTarget(null)
            setConfirmStep(0)
            setConfirmTitle("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tem certeza que deseja excluir?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. Você perderá todos os dados desta ideia.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDelTarget(null)
                setConfirmStep(0)
                setConfirmTitle("")
              }}
            >
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => setConfirmStep(2)}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!delTarget && confirmStep === 2}
        onOpenChange={(o) => {
          if (!o) {
            setDelTarget(null)
            setConfirmStep(0)
            setConfirmTitle("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmação final</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">
              Para confirmar a exclusão, digite o título da ideia:
              <br />
              <span className="font-medium">{delTarget?.titulo}</span>
            </p>
            <Input
              value={confirmTitle}
              onChange={(e) => setConfirmTitle(e.target.value)}
              placeholder="Digite o título exato"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDelTarget(null)
                setConfirmStep(0)
                setConfirmTitle("")
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!delTarget || confirmTitle.trim() !== (delTarget?.titulo || "").trim()}
              onClick={async () => {
                if (!delTarget) return
                try {
                  await bridge("ideias", "delete", { id: delTarget.id })
                  toast({ title: "Ideia excluída" })
                  onDelete?.(delTarget)
                } catch (err: any) {
                  toast({
                    title: "Erro ao excluir",
                    description: err?.message || String(err),
                    variant: "destructive",
                  })
                } finally {
                  setDelTarget(null)
                  setConfirmStep(0)
                  setConfirmTitle("")
                }
              }}
            >
              Sim, excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
