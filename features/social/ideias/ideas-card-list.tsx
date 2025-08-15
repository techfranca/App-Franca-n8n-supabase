"use client"

import * as React from "react"
import type { Ideia, UserRole } from "@/lib/types"
import { PlatformIcon } from "@/features/shared/platform-icon"
import { StatusBadge } from "@/features/shared/status-badge"
import { CalendarDays, MessageSquare, Pencil, Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { bridge } from "@/lib/bridge"
import { CarrosselPreview } from "./carrossel-preview"
import { CarrosselModal } from "./carrossel-modal"
import { formatDateLocal, formatDateTimeLocal, formatTimeLocal } from "@/lib/utils-date"
import { format } from "date-fns"

export function IdeasCardList({
  items,
  getClienteNome,
  role = "admin",
  userClienteId,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onStatusChange, // Adicionando callback para notificar mudanças de status
}: {
  items: Ideia[]
  getClienteNome: (clienteId: string) => string
  role?: UserRole
  userClienteId?: string | null
  onEdit?: (item: Ideia) => void
  onDelete?: (item: Ideia) => void
  onApprove?: (item: Ideia, comment?: string) => void
  onReject?: (item: Ideia, comment?: string) => void
  onStatusChange?: (ideiaId: string, newStatus: string) => void // Nova prop para comunicar mudanças de status
}) {
  const [comments, setComments] = React.useState<Record<string, string>>({})
  const [showAllComments, setShowAllComments] = React.useState<Record<string, boolean>>({})
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [localItems, setLocalItems] = React.useState<Ideia[]>([])
  const [comentariosArtes, setComentariosArtes] = React.useState<Record<string, Record<string, string>>>({})
  const [carrosselModal, setCarrosselModal] = React.useState<{
    aberto: boolean
    ideiaId: string | null
    tipo: "ideia" | "legenda"
  }>({
    aberto: false,
    ideiaId: null,
    tipo: "ideia",
  })
  const [commentRequiredDialog, setCommentRequiredDialog] = React.useState<{
    aberto: boolean
    tipo: "ajustar" | "reprovar" | null
    ideia: Ideia | null
    comentario: string
  }>({
    aberto: false,
    tipo: null,
    ideia: null,
    comentario: "",
  })
  const [confirmDialog, setConfirmDialog] = React.useState<{
    aberto: boolean
    tipo: "ajustar" | "reprovar" | null
    ideia: Ideia | null
    comentario: string
  }>({
    aberto: false,
    tipo: null,
    ideia: null,
    comentario: "",
  })
  const { toast } = useToast()
  const [delTarget, setDelTarget] = React.useState<Ideia | null>(null)
  const [confirmStep, setConfirmStep] = React.useState<number>(0)
  const [confirmTitle, setConfirmTitle] = React.useState<string>("")

  React.useEffect(() => {
    setLocalItems(items)
  }, [items])

  const isClient = role === "cliente"
  const canEdit = role === "admin" || role === "colaborador"
  const canSeeComments = !isClient

  const filteredItems = React.useMemo(() => {
    const itemsToFilter = localItems
    if (isClient && userClienteId) {
      return itemsToFilter.filter(
        (item) =>
          item.cliente_id === userClienteId &&
          item.status !== "em rascunho" &&
          item.status !== "rascunho" &&
          item.status !== "draft",
      )
    }
    return itemsToFilter
  }, [localItems, isClient, userClienteId])

  const handleVerTudoIdeia = (ideiaId: string) => {
    setCarrosselModal({ aberto: true, ideiaId, tipo: "ideia" })
  }

  const handleVerTudoLegenda = (ideiaId: string) => {
    setCarrosselModal({ aberto: true, ideiaId, tipo: "legenda" })
  }

  const handleFecharCarrosselModal = () => {
    setCarrosselModal({ aberto: false, ideiaId: null, tipo: "ideia" })
  }

  const handleComentarioArteChange = (ideiaId: string, arteIndex: number, comentario: string) => {
    setComentariosArtes((prev) => ({
      ...prev,
      [ideiaId]: {
        ...prev[ideiaId],
        [arteIndex]: comentario,
      },
    }))
  }

  const handleApprove = async (ideia: Ideia, comment: string) => {
    if (isProcessing) return
    setIsProcessing(true)

    try {
      await bridge("ideias", "update_aprovado", {
        id: ideia.id,
        comentario: comment.trim() || undefined,
      })
      toast({
        title: "Ideia aprovada com sucesso!",
        description: "A ideia foi aprovada e enviada para produção.",
        className: "bg-green-50 border-green-200",
      })
      onApprove?.(ideia, comment)
      onStatusChange?.(ideia.id, "aprovada")
    } catch (err: any) {
      toast({
        title: "Erro ao aprovar",
        description: err?.message || String(err),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAjustar = async (ideia: Ideia, comment: string) => {
    // A chamada será feita apenas em handleConfirmWithComment
    onReject?.(ideia, comment)
  }

  const handleReprovar = async (ideia: Ideia, comment: string) => {
    // A chamada será feita apenas em handleConfirmWithComment
    onReject?.(ideia, comment)
  }

  const handleConfirmCommentRequired = async () => {
    if (isProcessing) return

    if (!commentRequiredDialog.comentario.trim()) {
      toast({ title: "Por favor, preencha o comentário.", variant: "destructive" })
      return
    }

    if (!commentRequiredDialog.ideia) return

    const { tipo, ideia, comentario } = commentRequiredDialog

    setCommentRequiredDialog({ aberto: false, tipo: null, ideia: null, comentario: "" })

    setIsProcessing(true)

    try {
      const comentariosArtesIdeia = comentariosArtes[ideia.id] || {}
      const comentariosArtesArray = Object.entries(comentariosArtesIdeia)
        .filter(([_, comentario]) => comentario.trim())
        .map(([arteIndex, comentario]) => ({
          arte_index: Number.parseInt(arteIndex),
          comentario: comentario.trim(),
        }))

      if (tipo === "ajustar") {
        await bridge("ideias", "update_ajustar", {
          ...ideia,
          status: "ideia_em_alteracao",
          comentario: comentario,
          comentarios_artes: comentariosArtesArray,
          created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          comentarios: [
            ...(ideia.comentarios || []),
            {
              autor: "Cliente",
              texto: comentario,
              created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            },
          ],
        })

        setLocalItems((prevItems) =>
          prevItems.map((item) => (item.id === ideia.id ? { ...item, status: "ideia_em_alteracao" as const } : item)),
        )

        onStatusChange?.(ideia.id, "ideia_em_alteracao")

        toast({
          title: "Solicitação de ajuste enviada",
          description: "A ideia foi enviada para ajustes.",
          className: "bg-yellow-50 border-yellow-200",
        })
      } else if (tipo === "reprovar") {
        await bridge("ideias", "update_reprovado", {
          ...ideia,
          status: "reprovada",
          comentario: comentario,
          comentarios_artes: comentariosArtesArray,
          created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          comentarios: [
            ...(ideia.comentarios || []),
            {
              autor: "Cliente",
              texto: comentario,
              created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            },
          ],
        })

        setLocalItems((prevItems) =>
          prevItems.map((item) => (item.id === ideia.id ? { ...item, status: "reprovada" as const } : item)),
        )

        onStatusChange?.(ideia.id, "reprovada")

        toast({
          title: "Ideia reprovada",
          description: "A ideia foi reprovada.",
          className: "bg-red-50 border-red-200",
        })
      }
    } catch (err: any) {
      toast({
        title: tipo === "ajustar" ? "Erro ao solicitar ajuste" : "Erro ao reprovar",
        description: err?.message || String(err),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmWithComment = async () => {
    if (isProcessing) return

    if (!confirmDialog.ideia) return

    const { tipo, ideia, comentario } = confirmDialog

    setConfirmDialog({ aberto: false, tipo: null, ideia: null, comentario: "" })

    setIsProcessing(true)

    try {
      const comentariosArtesIdeia = comentariosArtes[ideia.id] || {}
      const comentariosArtesArray = Object.entries(comentariosArtesIdeia)
        .filter(([_, comentario]) => comentario.trim())
        .map(([arteIndex, comentario]) => ({
          arte_index: Number.parseInt(arteIndex),
          comentario: comentario.trim(),
        }))

      if (tipo === "ajustar") {
        await bridge("ideias", "update_ajustar", {
          ...ideia,
          status: "ideia_em_alteracao",
          comentario: comentario,
          comentarios_artes: comentariosArtesArray,
          created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          comentarios: [
            ...(ideia.comentarios || []),
            {
              autor: "Cliente",
              texto: comentario,
              created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            },
          ],
        })

        setLocalItems((prevItems) =>
          prevItems.map((item) => (item.id === ideia.id ? { ...item, status: "ideia_em_alteracao" as const } : item)),
        )

        onStatusChange?.(ideia.id, "ideia_em_alteracao")

        toast({
          title: "Solicitação de ajuste enviada",
          description: "A ideia foi enviada para ajustes.",
          className: "bg-yellow-50 border-yellow-200",
        })
      } else if (tipo === "reprovar") {
        await bridge("ideias", "update_reprovado", {
          ...ideia,
          status: "reprovada",
          comentario: comentario,
          comentarios_artes: comentariosArtesArray,
          created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          comentarios: [
            ...(ideia.comentarios || []),
            {
              autor: "Cliente",
              texto: comentario,
              created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            },
          ],
        })

        setLocalItems((prevItems) =>
          prevItems.map((item) => (item.id === ideia.id ? { ...item, status: "reprovada" as const } : item)),
        )

        onStatusChange?.(ideia.id, "reprovada")

        toast({
          title: "Ideia reprovada",
          description: "A ideia foi reprovada.",
          className: "bg-red-50 border-red-200",
        })
      }
    } catch (err: any) {
      toast({
        title: tipo === "ajustar" ? "Erro ao solicitar ajuste" : "Erro ao reprovar",
        description: err?.message || String(err),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const ideiaCarrosselModal = carrosselModal.ideiaId ? filteredItems.find((i) => i.id === carrosselModal.ideiaId) : null

  const hasArtComments = (ideiaId: string): boolean => {
    const comentariosArtesIdeia = comentariosArtes[ideiaId] || {}
    return Object.values(comentariosArtesIdeia).some((comentario) => comentario.trim().length > 0)
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((i) => {
          const dataPost = i.data_publicacao_completa || i.data_publicacao || ""
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
                {i.data_publicacao_completa && (
                  <span className="text-xs rounded bg-blue-100 text-blue-800 px-2 py-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeLocal(i.data_publicacao_completa)}
                  </span>
                )}
              </div>

              <div className="text-base font-semibold mb-1">{i.titulo}</div>
              <div className="text-xs text-muted-foreground mb-2">{cliente}</div>

              <div className="mb-2">
                <StatusBadge status={i.status} map="ideia" />
              </div>

              <div className="text-sm mb-2">
                <div className="font-medium">Ideia</div>
                {i.formato === "Carrossel" ? (
                  <CarrosselPreview textoCompleto={i.ideia || ""} onVerTudo={() => handleVerTudoIdeia(i.id)} />
                ) : (
                  <div className="text-muted-foreground font-bold max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                    {i.ideia || "—"}
                  </div>
                )}
              </div>

              {i.formato === "Reels" && i.roteiro ? (
                <div className="text-sm mb-2">
                  <div className="font-medium">Roteiro</div>
                  <div className="text-muted-foreground max-w-full overflow-x-hidden whitespace-pre-wrap break-words font-bold">
                    {i.roteiro}
                  </div>
                </div>
              ) : null}

              <div className="text-sm mb-2">
                <div className="font-medium">Legenda</div>
                {i.formato === "Carrossel" ? (
                  <CarrosselPreview
                    textoCompleto={i.legenda || ""}
                    onVerTudo={() => handleVerTudoLegenda(i.id)}
                    textoVerTudo="Ver legenda"
                  />
                ) : (
                  <div className="text-muted-foreground font-bold max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                    {i.legenda || "—"}
                  </div>
                )}
              </div>

              {canSeeComments && comentariosCount > 0 ? (
                <div className="mb-2 rounded border bg-slate-50 p-2">
                  {!showAll ? (
                    <div className="text-xs">
                      <div className="mb-1 text-muted-foreground">
                        <span className="font-medium">{lastComment?.autor || "Comentário"}</span>{" "}
                        <span>{lastComment?.created_at ? "— " + formatDateTimeLocal(lastComment.created_at) : ""}</span>
                      </div>
                      <div className="max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                        {lastComment?.texto || ""}
                      </div>
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
                            <span>{c.created_at ? "— " + formatDateTimeLocal(c.created_at) : ""}</span>
                          </div>
                          <div className="text-sm text-gray-700 max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                            {c.texto || ""}
                          </div>
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

              {canEdit &&
              (i.status === "ideia_em_alteracao" || i.status === "reprovada") &&
              i.comentarios_artes &&
              i.comentarios_artes.length > 0 ? (
                <div className="mb-2 rounded border bg-orange-50 border-orange-200 p-3">
                  <div className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentários das Artes
                  </div>
                  <div className="space-y-2">
                    {i.comentarios_artes.map((comentarioArte, idx) => (
                      <div key={idx} className="bg-white rounded border border-orange-200 p-2">
                        <div className="text-xs font-medium text-orange-700 mb-1">
                          Arte {comentarioArte.arte_index + 1}
                        </div>
                        <div className="text-sm text-gray-700 max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                          {comentarioArte.comentario}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2 mb-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Data de aprovação:</span>
                  <span className="text-muted-foreground">
                    {i.data_aprovacao ? formatDateLocal(i.data_aprovacao) : "Não aprovada"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Data de postagem:</span>
                  <span className="text-muted-foreground">
                    {i.data_publicacao_completa
                      ? formatDateLocal(i.data_publicacao_completa)
                      : i.data_publicacao
                        ? formatDateLocal(i.data_publicacao)
                        : "Sem data"}
                  </span>
                </div>
                {i.referencia ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Referência:</span>
                    <a
                      href={String(i.referencia)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4b8655] underline max-w-full overflow-x-hidden break-all"
                    >
                      {String(i.referencia)}
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {i.data_publicacao_completa
                      ? formatDateLocal(i.data_publicacao_completa)
                      : i.data_publicacao
                        ? formatDateLocal(i.data_publicacao)
                        : "Sem data"}
                  </span>
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
                    placeholder="Comentário (opcional para aprovação, obrigatório para ajuste/reprovação)"
                    value={comment}
                    onChange={(e) => setComments((c) => ({ ...c, [i.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="bg-green-600 text-white hover:bg-green-700"
                      disabled={isProcessing}
                      onClick={() => handleApprove(i, comment)}
                    >
                      Aprovado
                    </Button>
                    <Button
                      className="bg-yellow-600 text-white hover:bg-yellow-700"
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (comment.trim() || hasArtComments(i.id)) {
                          setConfirmDialog({
                            aberto: true,
                            tipo: "ajustar",
                            ideia: i,
                            comentario: comment.trim(),
                          })
                        } else {
                          setCommentRequiredDialog({
                            aberto: true,
                            tipo: "ajustar",
                            ideia: i,
                            comentario: "",
                          })
                        }
                      }}
                    >
                      Ajustar
                    </Button>
                    <Button
                      className="bg-red-600 text-white hover:bg-red-700"
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (comment.trim() || hasArtComments(i.id)) {
                          setConfirmDialog({
                            aberto: true,
                            tipo: "reprovar",
                            ideia: i,
                            comentario: comment.trim(),
                          })
                        } else {
                          setCommentRequiredDialog({
                            aberto: true,
                            tipo: "reprovar",
                            ideia: i,
                            comentario: "",
                          })
                        }
                      }}
                    >
                      Reprovado
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {ideiaCarrosselModal && (
        <CarrosselModal
          aberto={carrosselModal.aberto}
          textoCompleto={
            carrosselModal.tipo === "legenda" ? ideiaCarrosselModal.legenda || "" : ideiaCarrosselModal.ideia || ""
          }
          onClose={handleFecharCarrosselModal}
          comentariosArtes={comentariosArtes[ideiaCarrosselModal.id] || {}}
          onComentarioArteChange={(arteIndex, comentario) =>
            handleComentarioArteChange(ideiaCarrosselModal.id, arteIndex, comentario)
          }
        />
      )}

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

      <Dialog
        open={commentRequiredDialog.aberto}
        onOpenChange={(o) => {
          if (!o) {
            setCommentRequiredDialog({ aberto: false, tipo: null, ideia: null, comentario: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comentário obrigatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {commentRequiredDialog.tipo === "ajustar"
                ? "Para solicitar ajustes é necessário deixar um comentário explicando o que deve ser alterado."
                : "Para reprovar é necessário deixar um comentário explicando o motivo da reprovação."}
            </p>
            <Textarea
              className="font-bold"
              placeholder="Digite seu comentário aqui..."
              value={commentRequiredDialog.comentario}
              onChange={(e) => setCommentRequiredDialog((prev) => ({ ...prev, comentario: e.target.value }))}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCommentRequiredDialog({ aberto: false, tipo: null, ideia: null, comentario: "" })}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className={
                commentRequiredDialog.tipo === "ajustar"
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              disabled={isProcessing}
              onClick={handleConfirmCommentRequired}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDialog.aberto}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmDialog({ aberto: false, tipo: null, ideia: null, comentario: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.tipo === "ajustar" ? "Confirmar solicitação de ajuste" : "Confirmar reprovação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {confirmDialog.tipo === "ajustar"
                ? "Tem certeza que deseja solicitar ajustes nesta ideia?"
                : "Tem certeza que deseja reprovar esta ideia?"}
            </p>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm font-medium mb-1">Seu comentário:</p>
              <p className="text-sm text-gray-700">{confirmDialog.comentario}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDialog({ aberto: false, tipo: null, ideia: null, comentario: "" })}
            >
              Não
            </Button>
            <Button
              type="button"
              className={
                confirmDialog.tipo === "ajustar" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-red-600 hover:bg-red-700"
              }
              disabled={isProcessing}
              onClick={handleConfirmWithComment}
            >
              Sim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
