"use client"

import * as React from "react"
import type { Publicacao, Ideia, UserRole } from "@/lib/types"
import { PlatformIcon } from "@/features/shared/platform-icon"
import { StatusBadge } from "@/features/shared/status-badge"
import { CalendarDays, MessageSquare, Pencil, Trash2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { bridge } from "@/lib/bridge"
import { buildPublicationUpdatePayload } from "@/lib/build-payload"
import { Textarea } from "@/components/ui/textarea"
import { UploadMediaDialog } from "@/features/shared/upload-media-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { publicUrlFromPath, uploadMediaFilesToSupabase } from "@/lib/supabase-client"

export function PubsCardList({
  items,
  role = "admin",
  onEdit,
  onDelete,
  onPublish,
  onUpdated,
  getClienteNome,
  getIdeaById,
}: {
  items: Publicacao[]
  role?: UserRole
  onEdit: (item: Publicacao) => void
  onDelete: (item: Publicacao) => void
  onPublish: (item: Publicacao) => void
  onUpdated: (item: Publicacao) => void
  getClienteNome: (clienteId: string) => string
  getIdeaById: (id: string | null | undefined) => Ideia | null
}) {
  const isClient = role === "cliente"
  const canManage = role === "admin" || role === "colaborador"
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const [comments, setComments] = React.useState<Record<string, string>>({})
  const [showAllComments, setShowAllComments] = React.useState<Record<string, boolean>>({})
  const [uploadFor, setUploadFor] = React.useState<Publicacao | null>(null)
  const [preview, setPreview] = React.useState<{ pub: Publicacao; index: number } | null>(null)
  const [ratingDialog, setRatingDialog] = React.useState<{ pub: Publicacao; comment: string } | null>(null)
  const [selectedRating, setSelectedRating] = React.useState<number>(0)

  const [delTarget, setDelTarget] = React.useState<Publicacao | null>(null)
  const [confirmStep, setConfirmStep] = React.useState<0 | 1 | 2>(0)
  const [confirmTitle, setConfirmTitle] = React.useState<string>("")
  const { toast } = useToast()

  const [thumbBrokenStates, setThumbBrokenStates] = React.useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }

  function computePreviewUrl(p: Publicacao, index: number): { url: string; isVideo: boolean } | null {
    // Debug: verificar dados recebidos
    console.log("computePreviewUrl - Publicacao:", p.id, "midia_urls:", p.midia_urls, "midia_url:", p.midia_url)

    const mediaPaths = p.midia_urls && p.midia_urls.length > 0 ? p.midia_urls : p.midia_url ? [p.midia_url] : []

    console.log("computePreviewUrl - mediaPaths:", mediaPaths)

    if (mediaPaths.length === 0) {
      console.log("computePreviewUrl - Nenhuma mídia encontrada")
      return null
    }

    const path = mediaPaths[index] || ""
    console.log("computePreviewUrl - path:", path)

    const url = publicUrlFromPath(path) || ""
    console.log("computePreviewUrl - url gerada:", url)

    const isVideo = !!(url && url.toLowerCase().match(/\.(mp4|mov|webm)(\?|#|$)/i))
    return { url, isVideo }
  }

  async function upsertMedia(p: Publicacao, args: { newFiles: File[]; keptPaths: string[]; coverPath: string | null }) {
    const uploaded = args.newFiles.length ? await uploadMediaFilesToSupabase(args.newFiles, { folder: "uploads" }) : []
    const newPaths = uploaded.map((u) => u.path)

    const finalList = [...args.keptPaths, ...newPaths].slice(0, 10)
    const firstPath = finalList[0] ?? null
    const coverPath =
      args.coverPath && finalList.includes(args.coverPath) ? args.coverPath : (finalList.find((x) => !!x) ?? null)

    const updated: Publicacao = {
      ...p,
      midia_url: firstPath,
      midia_urls: finalList,
      cover_url: coverPath,
      status: "publicacao_em_aprovacao",
    }

    onUpdated(updated)

    const payload = buildPublicationUpdatePayload(updated)
    await bridge("publicacoes", "update", payload)

    toast({ title: "Mídias atualizadas — Publicação em aprovação do cliente" })
  }

  async function reopenForApproval(p: Publicacao) {
    const updated: Publicacao = { ...p, status: "publicacao_em_aprovacao" }
    onUpdated(updated)
    try {
      const payload = buildPublicationUpdatePayload(updated)
      await bridge("publicacoes", "update", payload)
      toast({ title: "Enviado para aprovação do cliente" })
    } catch {
      onUpdated(p)
      toast({ title: "Falha ao reenviar para aprovação", variant: "destructive" })
    }
  }

  async function handleApprovalWithRating(pub: Publicacao, comment: string, rating: number) {
    const comentarioObj = comment.trim()
      ? [{ texto: comment.trim(), autor: "Cliente", created_at: new Date().toISOString() }]
      : []
    const updated: Publicacao = {
      ...pub,
      status: "aprovado",
      comentarios: [...(pub.comentarios || []), ...comentarioObj],
    }
    onUpdated(updated)
    try {
      const payload = buildPublicationUpdatePayload(updated, {
        comentario: comment.trim() || undefined,
        nota: rating,
      })
      await bridge("publicacoes", "update_aprovado", payload)
      toast({ title: "Publicação aprovada com sucesso!" })
    } catch {
      onUpdated(pub)
      toast({ title: "Erro ao aprovar publicação", variant: "destructive" })
    }
  }

  function MediaBox({ p }: { p: Publicacao }) {
    console.log("MediaBox - Publicacao:", p.id, "midia_urls:", p.midia_urls, "midia_url:", p.midia_url)

    const mediaPaths = p.midia_urls && p.midia_urls.length > 0 ? p.midia_urls : p.midia_url ? [p.midia_url] : []
    const mediaCount = mediaPaths.length
    const currentMedia = mediaPaths[0] || null

    console.log("MediaBox - mediaPaths:", mediaPaths, "mediaCount:", mediaCount)

    const previewResult = computePreviewUrl(p, 0)
    const { url, isVideo } = previewResult || { url: "", isVideo: false }

    console.log("MediaBox - previewResult:", previewResult)

    const [broken, setBroken] = React.useState(false)
    const [retryCount, setRetryCount] = React.useState(0)
    const finalUrl = broken ? "/placeholder.svg?height=300&width=600" : url

    const handleRetry = () => {
      setBroken(false)
      setRetryCount((prev) => prev + 1)
    }

    return (
      <div className="mb-2">
        <div
          className={cn(
            "w-full rounded border p-2 bg-slate-50 cursor-pointer group",
            url ? "min-h-[200px]" : "bg-slate-50/60",
          )}
          onClick={() => {
            if (url && !broken) setPreview({ pub: p, index: 0 })
          }}
          title={url && !broken ? "Clique para visualizar" : ""}
        >
          {url && !broken ? (
            isVideo ? (
              <video
                key={`video-${retryCount}`}
                src={finalUrl || ""}
                controls
                className="w-full max-h-[300px] rounded object-contain"
                onError={() => {
                  console.log("MediaBox - Erro ao carregar vídeo:", finalUrl)
                  setBroken(true)
                }}
              />
            ) : (
              <img
                key={`img-${retryCount}`}
                src={finalUrl || "/placeholder.svg?height=300&width=600&query=preview-da-midia-da-publicacao"}
                alt="Mídia da publicação"
                className="w-full max-h-[300px] rounded object-contain"
                onError={() => {
                  console.log("MediaBox - Erro ao carregar imagem:", finalUrl)
                  setBroken(true)
                }}
              />
            )
          ) : (
            <div className="text-xs text-muted-foreground text-center py-8">
              {url ? (
                <div className="space-y-2">
                  <div>⚠️ Mídia temporariamente indisponível</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRetry()
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                "Sem mídia"
              )}
              {/* Debug info */}
              <div className="text-[10px] mt-1 opacity-50">
                Debug: urls={mediaPaths.length}, url="{url}", broken={broken.toString()}
              </div>
            </div>
          )}
        </div>
        {mediaCount > 1 ? (
          <div className="mt-2 grid grid-cols-6 gap-1">
            {mediaPaths.slice(0, 10).map((path, i) => {
              const u = publicUrlFromPath(path) || ""
              const vid = u.toLowerCase().match(/\.(mp4|mov|webm)(\?|#|$)/i)
              const thumbBroken = thumbBrokenStates[`${p.id}-${i}`] ?? false
              return (
                <button
                  key={i}
                  className="rounded overflow-hidden border h-14 bg-white"
                  onClick={() => setPreview({ pub: p, index: i })}
                  title="Visualizar"
                >
                  {vid ? (
                    <div className="text-[10px] text-center p-2">Vídeo</div>
                  ) : (
                    <img
                      src={thumbBroken ? "/placeholder.svg?height=80&width=80&query=miniatura-da-publicacao" : u}
                      alt={`thumb-${i}`}
                      className="w-full h-full object-cover"
                      onError={() => {
                        console.log("MediaBox - Erro ao carregar thumbnail:", u)
                        setThumbBrokenStates((s) => ({ ...s, [`${p.id}-${i}`]: true }))
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  const filteredPublications = items.filter((p) => p.status !== "excluido")

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPublications.map((p) => {
          const dataPost =
            (p.data_postagem ? new Date(p.data_postagem) : null)?.toISOString().slice(0, 10) ||
            (p.data_agendada ? new Date(p.data_agendada) : null)?.toISOString().slice(0, 10) ||
            ""
          const comentariosRaw = p.comentarios ?? []
          const comentarios = Array.isArray(comentariosRaw)
            ? comentariosRaw
            : typeof comentariosRaw === "string" && comentariosRaw.trim()
              ? [{ texto: comentariosRaw, autor: "Cliente", created_at: new Date().toISOString() }]
              : []
          const comentariosCount = comentarios.length
          const lastComment = comentariosCount ? comentarios[comentariosCount - 1] : null
          const showAll = !!showAllComments[p.id]
          const cliente = getClienteNome(p.cliente_id)
          const idea = getIdeaById(p.ideia_id ?? null)

          const borderCls = cn(
            "relative rounded-lg border shadow-sm p-4 bg-white transition-colors",
            p.status === "publicacao_em_alteracao" && "border-orange-400",
            (p.status === "aprovado" || p.status === "publicada") && "border-emerald-400",
            p.status === "em_design" && "border-blue-400",
          )

          const showPublishShortcut = canManage && p.status === "aprovado"
          const isExpanded = !!expanded[p.id]
          const clientModerationVisible = isClient && p.status === "publicacao_em_aprovacao"
          const comment = comments[p.id] ?? ""

          return (
            <div key={p.id} className={borderCls}>
              <div className="absolute top-2 right-2 flex gap-2">
                {showPublishShortcut ? (
                  <Button size="sm" variant="outline" onClick={() => onPublish(p)} aria-label="Publicado">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Publicado
                  </Button>
                ) : null}
                <Button size="icon" variant="outline" onClick={() => onEdit(p)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                {canManage && (
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => {
                      setDelTarget(p)
                      setConfirmStep(1)
                      setConfirmTitle("")
                    }}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <PlatformIcon platform={p.plataforma} className="h-5 w-5 text-[#4b8655]" />
                <span className="text-xs rounded bg-slate-100 px-2 py-0.5">{p.formato}</span>
              </div>

              <button
                className="text-left text-base font-semibold mb-1 hover:underline"
                onClick={() => toggle(p.id)}
                title="Ver detalhes"
              >
                {p.titulo}
              </button>
              <div className="text-xs text-muted-foreground mb-2">{cliente}</div>

              <div className="mb-2">
                <StatusBadge status={p.status} map="publicacao" />
              </div>

              <MediaBox p={p} />

              {canManage || comentariosCount > 0 ? (
                <div className="mb-2 rounded border bg-amber-50 p-2">
                  <div className="text-xs font-medium mb-1">Feedback do cliente</div>
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
                            onClick={() => setShowAllComments((m) => ({ ...m, [p.id]: true }))}
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
                          onClick={() => setShowAllComments((m) => ({ ...m, [p.id]: false }))}
                        >
                          Ocultar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {isExpanded && (
                <div className="text-sm mb-2 space-y-2">
                  {idea ? (
                    <>
                      <div>
                        <div className="font-medium">Ideia</div>
                        <div className="text-muted-foreground">{idea.ideia || "—"}</div>
                      </div>
                      {p.formato === "Reels" && idea.roteiro ? (
                        <div>
                          <div className="font-medium">Roteiro</div>
                          <div className="text-muted-foreground whitespace-pre-wrap">{idea.roteiro}</div>
                        </div>
                      ) : null}
                      <div>
                        <div className="font-medium">Legenda</div>
                        <div className="text-muted-foreground">{p.legenda || "—"}</div>
                      </div>
                      <div className="grid gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Data de aprovação:</span>
                          <span className="text-muted-foreground">{idea.data_aprovacao || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Data de postagem:</span>
                          <span className="text-muted-foreground">{dataPost || "Sem data"}</span>
                        </div>
                        {idea.referencia ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Referência:</span>
                            <a
                              href={String(idea.referencia)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#4b8655] underline break-all"
                            >
                              {String(idea.referencia)}
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="font-medium">Legenda</div>
                        <div className="text-muted-foreground">{p.legenda || "—"}</div>
                      </div>
                      <div className="grid gap-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Data de postagem:</span>
                          <span className="text-muted-foreground">{dataPost || "Sem data"}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isClient && p.status === "publicacao_em_aprovacao" && (
                <div className="mt-3 grid gap-2">
                  <Textarea
                    placeholder="Comentário (obrigatório para reprovar)"
                    value={comment}
                    onChange={(e) => setComments((c) => ({ ...c, [p.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]"
                      onClick={() => {
                        setRatingDialog({ pub: p, comment })
                        setSelectedRating(0)
                      }}
                    >
                      Aprovado
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!comment.trim()) return
                        const comentarioObj = {
                          texto: comment.trim(),
                          autor: "Cliente",
                          created_at: new Date().toISOString(),
                        }
                        const updated: Publicacao = {
                          ...p,
                          status: "publicacao_em_alteracao",
                          comentarios: [...(p.comentarios || []), comentarioObj],
                        }
                        onUpdated(updated)
                        try {
                          const payload = buildPublicationUpdatePayload(updated, { comentario: comment })
                          await bridge("publicacoes", "update_reprovado", payload)
                        } catch {
                          onUpdated(p)
                        }
                      }}
                    >
                      Não aprovado
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>{dataPost || "Sem data"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{comentariosCount}</span>
                </div>
              </div>

              {uploadFor?.id === p.id && (
                <UploadMediaDialog
                  open={!!uploadFor}
                  onOpenChange={(v) => {
                    if (!v) setUploadFor(null)
                  }}
                  initial={{
                    paths: p.midia_urls?.length ? p.midia_urls : p.midia_url ? [p.midia_url] : [],
                    coverPath: p.cover_url ?? null,
                  }}
                  max={10}
                  onUpsert={async ({ newFiles, keptPaths, coverPath }) => {
                    await upsertMedia(p, { newFiles, keptPaths, coverPath })
                  }}
                />
              )}
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
            Esta ação não pode ser desfeita. Você perderá todos os dados desta publicação.
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
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmStep(2)
              }}
            >
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
              Para confirmar a exclusão, digite o título da publicação:
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
                  await bridge("publicacoes", "delete", { id: delTarget.id })
                  toast({ title: "Publicação excluída" })
                  onDelete(delTarget)
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

      {/* Visualização completa da mídia */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          {preview && (
            <div className="relative">
              <div className="flex items-center justify-between absolute z-10 top-1/2 left-0 right-0 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("bg-white/80 hover:bg-white", preview.index === 0 && "opacity-50 cursor-not-allowed")}
                  onClick={() => setPreview((prev) => prev && { ...prev, index: Math.max(0, prev.index - 1) })}
                  disabled={preview.index === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "bg-white/80 hover:bg-white",
                    preview.index === (preview.pub.midia_urls?.length ?? 1) - 1 && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={() =>
                    setPreview(
                      (prev) =>
                        prev && { ...prev, index: Math.min((prev.pub.midia_urls?.length ?? 1) - 1, prev.index + 1) },
                    )
                  }
                  disabled={preview.index === (preview.pub.midia_urls?.length ?? 1) - 1}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
              <div className="w-full h-full">
                {preview.pub.midia_urls && preview.pub.midia_urls.length > 0 ? (
                  preview.pub.midia_urls[preview.index].toLowerCase().match(/\.(mp4|mov|webm)(\?|#|$)/i) ? (
                    <video
                      src={publicUrlFromPath(preview.pub.midia_urls[preview.index]) || ""}
                      controls
                      className="w-full h-full rounded object-contain"
                    />
                  ) : (
                    <img
                      src={
                        publicUrlFromPath(preview.pub.midia_urls[preview.index]) ||
                        "/placeholder.svg?height=300&width=600&query=preview-da-midia-da-publicacao" ||
                        "/placeholder.svg" ||
                        "/placeholder.svg" ||
                        "/placeholder.svg" ||
                        "/placeholder.svg" ||
                        "/placeholder.svg"
                      }
                      alt="Mídia da publicação"
                      className="w-full h-full rounded object-contain"
                    />
                  )
                ) : (
                  <div className="text-xs text-muted-foreground">Sem mídia</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rating dialog */}
      <Dialog open={!!ratingDialog} onOpenChange={() => setRatingDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Avalie esta publicação</DialogTitle>
            <DialogDescription>Que nota você daria para esta publicação? (1 a 10)</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <Button
                  key={rating}
                  variant={selectedRating === rating ? "default" : "outline"}
                  className="aspect-square"
                  onClick={() => setSelectedRating(rating)}
                >
                  {rating}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialog(null)}>
              Cancelar
            </Button>
            <Button
              disabled={selectedRating === 0}
              onClick={async () => {
                if (ratingDialog && selectedRating > 0) {
                  await handleApprovalWithRating(ratingDialog.pub, ratingDialog.comment, selectedRating)
                  setRatingDialog(null)
                  setSelectedRating(0)
                }
              }}
            >
              Enviar Avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
