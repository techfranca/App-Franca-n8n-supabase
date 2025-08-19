"use client"

import * as React from "react"
import type { Publicacao, Ideia, UserRole } from "@/lib/types"
import { PlatformIcon } from "@/features/shared/platform-icon"
import { StatusBadge } from "@/features/shared/status-badge"
import {
  CalendarDays,
  MessageSquare,
  Pencil,
  Trash2,
  Upload,
  Maximize2,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { bridge } from "@/lib/bridge"
import { buildPublicationUpdatePayload } from "@/lib/build-payload"
import { Textarea } from "@/components/ui/textarea"
import { UploadMediaDialog } from "@/features/shared/upload-media-dialog"
import { useToast } from "@/hooks/use-toast"
import { publicUrlFromPath, uploadMediaFilesToSupabase } from "@/lib/supabase-client"
import { formatDateLocal, formatDateTimeLocal } from "@/lib/utils-date"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export function PubsCardList({
  items,
  getClienteNome,
  role = "admin",
  userClienteId,
  onUpdated,
  onEdit,
  onDelete,
  getIdeaById,
}: {
  items: Publicacao[]
  getClienteNome: (clienteId: string) => string
  role?: UserRole
  userClienteId?: string | null
  onUpdated: (item: Publicacao) => void
  onEdit?: (item: Publicacao) => void
  onDelete?: (item: Publicacao) => void
  getIdeaById: (ideiaId: string | null) => Ideia | undefined
}) {
  const canManage = role === "admin" || role === "colaborador" || role === "social_media"
  const isClient = role === "cliente"
  const isSocialMedia = role === "social_media"
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const [comments, setComments] = React.useState<Record<string, string>>({})
  const [showAllComments, setShowAllComments] = React.useState<Record<string, boolean>>({})
  const [uploadFor, setUploadFor] = React.useState<Publicacao | null>(null)
  const [preview, setPreview] = React.useState<{ pub: Publicacao; index: number } | null>(null)
  const [ratingDialog, setRatingDialog] = React.useState<{ pub: Publicacao; comment: string } | null>(null)
  const [selectedRating, setSelectedRating] = React.useState(0)

  const [commentRequiredDialog, setCommentRequiredDialog] = React.useState<{
    aberto: boolean
    tipo: "ajustar" | null
    pub: Publicacao | null
    comentario: string
  }>({
    aberto: false,
    tipo: null,
    pub: null,
    comentario: "",
  })

  const [confirmDialog, setConfirmDialog] = React.useState<{
    aberto: boolean
    tipo: "ajustar" | null
    pub: Publicacao | null
    comentario: string
  }>({
    aberto: false,
    tipo: null,
    pub: null,
    comentario: "",
  })

  const [mediaComments, setMediaComments] = React.useState<Record<string, Record<string, string>>>({})

  const [publishUrlDialog, setPublishUrlDialog] = React.useState<{ pub: Publicacao; url: string } | null>(null)

  const [delTarget, setDelTarget] = React.useState<Publicacao | null>(null)
  const [confirmStep, setConfirmStep] = React.useState<0 | 1 | 2>(0)
  const [confirmTitle, setConfirmTitle] = React.useState<string>("")
  const { toast } = useToast()

  const [thumbBrokenStates, setThumbBrokenStates] = React.useState<Record<string, boolean>>({})

  const [fazendoAgora, setFazendoAgora] = React.useState<Record<string, boolean>>({})
  const [prioridadeUrgente, setPrioridadeUrgente] = React.useState<Record<string, boolean>>({})

  const [adjustDialog, setAdjustDialog] = React.useState<{ pub: Publicacao; comment: string } | null>(null)

  React.useEffect(() => {
    console.log("[v0] === DEBUG useEffect fazendoAgora ===")
    console.log("[v0] Items recebidos:", items.length)

    const initialFazendoAgora: Record<string, boolean> = {}
    const initialPrioridadeUrgente: Record<string, boolean> = {}

    items.forEach((pub) => {
      console.log(`[v0] Pub ${pub.id}:`, {
        status: pub.status,
        atualizacao: (pub as any).atualizacao,
        prioridade: (pub as any).prioridade,
        titulo: pub.titulo,
      })

      if ((pub as any).atualizacao === "fazendo_agora") {
        console.log(`[v0] ✅ Pub ${pub.id} tem atualizacao: fazendo_agora - marcando como true`)
        initialFazendoAgora[pub.id] = true
      } else {
        console.log(`[v0] ❌ Pub ${pub.id} não tem atualizacao: fazendo_agora (valor: ${(pub as any).atualizacao})`)
      }

      if ((pub as any).prioridade === "urgente") {
        console.log(`[v0] ✅ Pub ${pub.id} tem prioridade: urgente - marcando como true`)
        initialPrioridadeUrgente[pub.id] = true
      }
    })

    console.log("[v0] Estado inicial fazendoAgora:", initialFazendoAgora)
    console.log("[v0] Estado inicial prioridadeUrgente:", initialPrioridadeUrgente)
    setFazendoAgora(initialFazendoAgora)
    setPrioridadeUrgente(initialPrioridadeUrgente)
  }, [items])

  function toggle(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }

  async function toggleFazendoAgora(p: Publicacao) {
    const isFazendoAgora = !fazendoAgora[p.id]

    setFazendoAgora((prev) => ({ ...prev, [p.id]: isFazendoAgora }))

    try {
      const payload = buildPublicationUpdatePayload(p, {
        atualizacao: isFazendoAgora ? "fazendo_agora" : null,
      })
      await bridge("publicacoes", "update", payload)

      toast({
        title: isFazendoAgora ? "Marcado como fazendo agora" : "Desmarcado como fazendo agora",
      })
    } catch (error) {
      setFazendoAgora((prev) => ({ ...prev, [p.id]: !isFazendoAgora }))
      toast({
        title: "Erro ao atualizar status",
        variant: "destructive",
      })
    }
  }

  const togglePrioridadeUrgente = async (p: Publicacao) => {
    const isUrgente = prioridadeUrgente[p.id]

    try {
      console.log(`[v0] Alternando prioridade urgente para pub ${p.id}:`, !isUrgente)

      const payload = buildPublicationUpdatePayload(p, {
        prioridade: !isUrgente ? "urgente" : null,
      })

      console.log("[v0] Payload prioridade urgente:", payload)

      await bridge("publicacoes", "update", payload)

      setPrioridadeUrgente((prev) => ({
        ...prev,
        [p.id]: !isUrgente,
      }))

      toast({
        title: !isUrgente ? "Publicação marcada como urgente" : "Prioridade urgente removida",
        description: !isUrgente ? "Esta publicação agora tem prioridade alta" : "A prioridade foi normalizada",
      })
    } catch (error) {
      console.error("[v0] Erro ao alterar prioridade urgente:", error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar a prioridade",
        variant: "destructive",
      })
    }
  }

  function computePreviewUrl(p: Publicacao, index: number): { url: string; isVideo: boolean } | null {
    console.log("=== DEBUG computePreviewUrl ===")
    console.log("Publicacao ID:", p.id)
    console.log("midia_urls:", p.midia_urls)
    console.log("midia_url:", p.midia_url)
    console.log("index:", index)

    const mediaPaths = p.midia_urls && p.midia_urls.length > 0 ? p.midia_urls : p.midia_url ? [p.midia_url] : []
    console.log("mediaPaths construído:", mediaPaths)

    if (mediaPaths.length === 0) {
      console.log("❌ Nenhuma mídia encontrada - retornando null")
      return null
    }

    const path = mediaPaths[index] || ""
    console.log("path selecionado:", path)

    if (!path) {
      console.log("❌ Path vazio - retornando null")
      return null
    }

    const url = publicUrlFromPath(path) || ""
    console.log("URL gerada pela publicUrlFromPath:", url)

    const isVideo = !!(url && url.toLowerCase().match(/\.(mp4|mov|webm)(\?|#|$)/i))
    console.log("isVideo:", isVideo)
    console.log("=== FIM DEBUG computePreviewUrl ===")

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
      status: "revisao", // Mudança: vai para revisão da social media primeiro
    }

    onUpdated(updated)

    if (p.status === "em_design") {
      setFazendoAgora((prev) => ({ ...prev, [p.id]: false }))
      const payload = buildPublicationUpdatePayload(updated, { atualizacao: null })
      await bridge("publicacoes", "update", payload)
    } else {
      const payload = buildPublicationUpdatePayload(updated)
      await bridge("publicacoes", "update", payload)
    }

    toast({ title: "Mídias atualizadas — Publicação em revisão da social media" })
  }

  async function reopenForApproval(p: Publicacao) {
    const updated: Publicacao = { ...p, status: "publicacao_em_aprovacao" }
    onUpdated(updated)

    if (p.status === "em_design") {
      setFazendoAgora((prev) => ({ ...prev, [p.id]: false }))
    }

    try {
      const payload = buildPublicationUpdatePayload(updated, p.status === "em_design" ? { atualizacao: null } : {})
      await bridge("publicacoes", "update", payload)
      toast({ title: "Enviado para aprovação do cliente" })
    } catch {
      onUpdated(p)
      toast({ title: "Falha ao reenviar para aprovação", variant: "destructive" })
    }
  }

  async function handleApprovalWithRating(pub: Publicacao, approved: boolean, comment: string, rating?: number) {
    const comentarioObj = comment.trim()
      ? [{ texto: comment.trim(), autor: "Cliente", created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss") }]
      : []
    const updated: Publicacao = {
      ...pub,
      status: "aprovado",
      comentarios: [...(pub.comentarios || []), ...comentarioObj],
    }
    onUpdated(updated)

    if (pub.status === "em_design") {
      setFazendoAgora((prev) => ({ ...prev, [pub.id]: false }))
    }

    try {
      const payload = buildPublicationUpdatePayload(updated, {
        comentario: comment.trim() || undefined,
        nota: rating,
        ...(pub.status === "em_design" ? { atualizacao: null } : {}),
      })
      await bridge("publicacoes", "update_aprovado", payload)
      toast({ title: "Publicação aprovada com sucesso!" })
    } catch {
      onUpdated(pub)
      toast({ title: "Erro ao aprovar publicação", variant: "destructive" })
    }
  }

  async function handlePublishWithUrl(pub: Publicacao, url: string) {
    const updated: Publicacao = {
      ...pub,
      status: "publicada",
      link_publicado: url.trim(),
    }
    onUpdated(updated)

    if (pub.status === "em_design") {
      setFazendoAgora((prev) => ({ ...prev, [pub.id]: false }))
    }

    try {
      const payload = buildPublicationUpdatePayload(updated, {
        link_publicado: url.trim(),
        ...(pub.status === "em_design" ? { atualizacao: null } : {}),
      })
      await bridge("publicacoes", "update_publicado", payload)
      toast({ title: "Publicação confirmada com sucesso!" })
    } catch {
      onUpdated(pub)
      toast({ title: "Erro ao confirmar publicação", variant: "destructive" })
    }
  }

  async function handleSocialMediaApproval(pub: Publicacao, approved: boolean, comment: string) {
    const comentarioObj = comment.trim()
      ? [{ texto: comment.trim(), autor: "Social Media", created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss") }]
      : []
    const updated: Publicacao = {
      ...pub,
      status: "publicacao_em_aprovacao",
      comentarios: [...(pub.comentarios || []), ...comentarioObj],
    }
    onUpdated(updated)

    try {
      const payload = buildPublicationUpdatePayload(updated, {
        comentario: comment.trim() || undefined,
      })
      await bridge("publicacoes", "update", payload)
      toast({ title: "Publicação aprovada e enviada para o cliente!" })
    } catch {
      onUpdated(pub)
    }
  }

  async function handleSocialMediaAdjustment(pub: Publicacao, comment: string) {
    if (!comment.trim()) {
      toast({ title: "Comentário é obrigatório para ajustar", variant: "destructive" })
      return
    }

    const comentarioObj = {
      texto: comment.trim(),
      autor: "Social Media",
      created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    }
    const updated: Publicacao = {
      ...pub,
      status: "em_design",
      comentarios: [...(pub.comentarios || []), comentarioObj],
    }
    onUpdated(updated)

    try {
      const payload = buildPublicationUpdatePayload(updated, {
        comentario: comment.trim(),
      })
      await bridge("publicacoes", "update", payload)
      toast({ title: "Publicação enviada de volta para design" })
    } catch {
      onUpdated(pub)
    }
  }

  function MediaBox({ p }: { p: Publicacao }) {
    console.log("=== DEBUG MediaBox ===")
    console.log("Publicacao ID:", p.id)
    console.log("midia_urls:", p.midia_urls)
    console.log("midia_url:", p.midia_url)

    const mediaPaths = p.midia_urls && p.midia_urls.length > 0 ? p.midia_urls : p.midia_url ? [p.midia_url] : []
    const mediaCount = mediaPaths.length

    console.log("mediaPaths:", mediaPaths)
    console.log("mediaCount:", mediaCount)

    const previewResult = computePreviewUrl(p, 0)
    console.log("previewResult:", previewResult)

    const { url, isVideo } = previewResult || { url: "", isVideo: false }
    console.log("URL final:", url)
    console.log("=== FIM DEBUG MediaBox ===")

    const [broken, setBroken] = React.useState(false)
    const finalUrl = broken ? "/placeholder.svg?height=300&width=600" : url

    return (
      <div className="mb-2">
        <div
          className={cn(
            "w-full rounded border p-2 bg-slate-50 cursor-pointer group",
            url ? "h-40" : "h-20 bg-slate-50/60", // Altura fixa mais compacta
          )}
          onClick={() => {
            if (url && !broken) setPreview({ pub: p, index: 0 })
          }}
          title={url && !broken ? "Clique para visualizar" : ""}
        >
          {url && !broken ? (
            isVideo ? (
              <video
                src={finalUrl || ""}
                controls
                className="w-full h-full rounded object-cover" // object-cover para manter proporção
                onError={() => {
                  console.log("❌ Erro ao carregar vídeo:", finalUrl)
                  setBroken(true)
                }}
              />
            ) : (
              <img
                src={finalUrl || "/placeholder.svg?height=160&width=300&query=preview-da-midia-da-publicacao"}
                alt="Mídia da publicação"
                className="w-full h-full rounded object-cover" // object-cover para manter proporção
                onError={() => {
                  console.log("❌ Erro ao carregar imagem:", finalUrl)
                  setBroken(true)
                }}
              />
            )
          ) : (
            <div className="text-xs text-muted-foreground flex items-center justify-center h-full">
              Midia em desenvolvimento
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

        {isClient && url && (
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1 text-xs bg-transparent"
              onClick={() => setPreview({ pub: p, index: 0 })}
            >
              <Maximize2 className="h-3 w-3" />
              Visualizar
            </Button>
          </div>
        )}

        {canManage && (
          <div className="mt-2 flex items-center gap-2">
            {p.status === "publicacao_em_alteracao" ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs bg-transparent"
                  onClick={() => setUploadFor(p)}
                >
                  <Upload className="h-3 w-3" />
                  Substituir mídia
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs bg-transparent"
                  onClick={() => reopenForApproval(p)}
                >
                  Enviar para o cliente
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs bg-transparent"
                  onClick={() => setUploadFor(p)}
                >
                  <Upload className="h-3 w-3" />
                  Editar mídia
                </Button>
                {url ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs bg-transparent"
                    onClick={() => setPreview({ pub: p, index: 0 })}
                  >
                    <Maximize2 className="h-3 w-3" />
                    Visualizar
                  </Button>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  const clearFazendoAgoraAndPrioridade = (pubId: string) => {
    setFazendoAgora((prev) => {
      const newState = { ...prev }
      delete newState[pubId]
      return newState
    })
    setPrioridadeUrgente((prev) => {
      const newState = { ...prev }
      delete newState[pubId]
      return newState
    })
  }

  const securityFilteredItems = React.useMemo(() => {
    if (isClient && userClienteId) {
      return items.filter((item) => item.cliente_id === userClienteId)
    }
    return items
  }, [items, isClient, userClienteId])

  const filteredPublications = securityFilteredItems.filter((p) => p.status !== "excluido")

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const aUrgente = prioridadeUrgente[a.id] || false
      const bUrgente = prioridadeUrgente[b.id] || false

      if (aUrgente && !bUrgente) return -1
      if (!aUrgente && bUrgente) return 1

      return 0
    })
  }, [items, prioridadeUrgente])

  const hasMediaComments = (pubId: string): boolean => {
    const comentariosMidiasPub = mediaComments[pubId] || {}
    return Object.values(comentariosMidiasPub).some((comentario) => comentario.trim().length > 0)
  }

  const handleConfirmCommentRequired = async () => {
    if (!commentRequiredDialog.comentario.trim()) {
      toast({ title: "Por favor, preencha o comentário.", variant: "destructive" })
      return
    }

    if (!commentRequiredDialog.pub) return

    const { pub, comentario } = commentRequiredDialog
    setCommentRequiredDialog({ aberto: false, tipo: null, pub: null, comentario: "" })

    try {
      const comentariosMidiasPub = mediaComments[pub.id] || {}
      const comentariosMidiasArray = Object.entries(comentariosMidiasPub)
        .filter(([_, comentario]) => comentario.trim())
        .map(([midiaIndex, comentario]) => ({
          midia_index: Number.parseInt(midiaIndex),
          comentario: comentario.trim(),
        }))

      const comentarioObj = {
        texto: comentario,
        autor: "Cliente",
        created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      }

      const updated: Publicacao = {
        ...pub,
        status: "publicacao_em_alteracao",
        comentarios: [...(pub.comentarios || []), comentarioObj],
      }

      onUpdated(updated)

      const payload = buildPublicationUpdatePayload(updated, {
        comentario: comentario,
        comentarios_midias: comentariosMidiasArray,
      })

      await bridge("publicacoes", "update_reprovado", payload)
      setComments((c) => ({ ...c, [pub.id]: "" }))
      toast({
        title: "Solicitação de ajuste enviada",
        description: "A publicação foi enviada para ajustes.",
        className: "bg-yellow-50 border-yellow-200",
      })
    } catch (err: any) {
      toast({
        title: "Erro ao solicitar ajuste",
        description: err?.message || String(err),
        variant: "destructive",
      })
    }
  }

  const handleConfirmWithComment = async () => {
    if (!confirmDialog.pub) return

    const { pub, comentario } = confirmDialog
    setConfirmDialog({ aberto: false, tipo: null, pub: null, comentario: "" })

    try {
      const comentariosMidiasPub = mediaComments[pub.id] || {}
      const comentariosMidiasArray = Object.entries(comentariosMidiasPub)
        .filter(([_, comentario]) => comentario.trim())
        .map(([midiaIndex, comentario]) => ({
          midia_index: Number.parseInt(midiaIndex),
          comentario: comentario.trim(),
        }))

      const comentarioObj = {
        texto: comentario,
        autor: "Cliente",
        created_at: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      }

      const updated: Publicacao = {
        ...pub,
        status: "publicacao_em_alteracao",
        comentarios: [...(pub.comentarios || []), comentarioObj],
      }

      onUpdated(updated)

      const payload = buildPublicationUpdatePayload(updated, {
        comentario: comentario,
        comentarios_midias: comentariosMidiasArray,
      })

      await bridge("publicacoes", "update_reprovado", payload)
      setComments((c) => ({ ...c, [pub.id]: "" }))
      toast({
        title: "Solicitação de ajuste enviada",
        description: "A publicação foi enviada para ajustes.",
        className: "bg-yellow-50 border-yellow-200",
      })
    } catch (err: any) {
      toast({
        title: "Erro ao solicitar ajuste",
        description: err?.message || String(err),
        variant: "destructive",
      })
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedItems.map((p) => {
        const dataPost = formatDateLocal(p.data_postagem || p.data_agendada)
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
          p.status === "revisao" && "border-purple-400",
          prioridadeUrgente[p.id] && "border-red-500 border-2",
        )

        const showPublishShortcut = canManage && p.status === "aprovado"
        const isExpanded = !!expanded[p.id]
        const clientModerationVisible = isClient && p.status === "publicacao_em_aprovacao"
        const socialMediaModerationVisible = isSocialMedia && p.status === "revisao"
        const comment = comments[p.id] ?? ""

        const showClockButton = canManage && p.status === "em_design"
        const isFazendoAgora = fazendoAgora[p.id]
        const showAlertButton =
          canManage && !isClient && (p.status === "em_design" || p.status === "publicacao_em_alteracao")
        const isUrgente = prioridadeUrgente[p.id]

        return (
          <div key={p.id} className={cn(borderCls, isFazendoAgora && "bg-yellow-50 border-yellow-300")}>
            <div className="absolute top-2 right-2 flex gap-1">
              {showAlertButton && (
                <Button
                  size="sm"
                  variant={isUrgente ? "default" : "outline"}
                  onClick={() => togglePrioridadeUrgente(p)}
                  aria-label="Prioridade urgente"
                  className={cn("h-8 w-8 p-0", isUrgente && "bg-red-500 hover:bg-red-600 text-white")}
                >
                  <AlertTriangle className="h-3 w-3" />
                </Button>
              )}
              {showClockButton && (
                <Button
                  size="sm"
                  variant={isFazendoAgora ? "default" : "outline"}
                  onClick={() => toggleFazendoAgora(p)}
                  aria-label="Fazendo agora"
                  className={cn("h-8 w-8 p-0", isFazendoAgora && "bg-yellow-500 hover:bg-yellow-600 text-white")}
                >
                  <Clock className="h-3 w-3" />
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => onEdit(p)} aria-label="Editar" className="h-8 w-8 p-0">
                <Pencil className="h-3 w-3" />
              </Button>
              {canManage && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setDelTarget(p)
                    setConfirmStep(1)
                    setConfirmTitle("")
                  }}
                  aria-label="Excluir"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 mb-2 pr-20">
              <PlatformIcon platform={p.plataforma} className="h-4 w-4 text-[#4b8655]" />
              <span className="text-xs rounded bg-slate-100 px-2 py-0.5">{p.formato}</span>
            </div>
            <button
              className="text-left text-sm font-semibold mb-1 hover:underline pr-20"
              onClick={() => toggle(p.id)}
              title="Ver detalhes"
            >
              {p.titulo}
            </button>
            <div className="text-xs text-muted-foreground mb-2">{cliente}</div>
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <StatusBadge status={p.status} map="publicacao" />
              {isUrgente && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  Urgente
                </span>
              )}
              {isFazendoAgora && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  <Clock className="h-3 w-3" />
                  fazendo agora
                </span>
              )}
              {p.nota && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  ⭐ {p.nota}/10
                </div>
              )}
            </div>
            <div className="mb-3">
              <MediaBox p={p} />
            </div>
            {p.link_publicado && (
              <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded">
                <div className="text-xs font-medium mb-1">Link da publicação:</div>
                <a
                  href={p.link_publicado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 underline text-sm break-all"
                >
                  {p.link_publicado}
                </a>
              </div>
            )}
            {canManage || comentariosCount > 0 ? (
              <div className="mb-2 rounded border bg-amber-50 p-2">
                <div className="text-xs font-medium mb-1">Feedback do cliente</div>
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
                          <span>{c.created_at ? "— " + formatDateTimeLocal(c.created_at) : ""}</span>
                        </div>
                        <div className="max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                          {c.texto || ""}
                        </div>
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
                      <div className="text-muted-foreground max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                        {idea.ideia || "—"}
                      </div>
                    </div>
                    {p.formato === "Reels" && idea.roteiro ? (
                      <div>
                        <div className="font-medium">Roteiro</div>
                        <div className="text-muted-foreground max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                          {idea.roteiro}
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <div className="font-medium">Legenda</div>
                      <div className="text-muted-foreground max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                        {p.legenda || "—"}
                      </div>
                    </div>
                    <div className="grid gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Data de aprovação:</span>
                        <span className="text-muted-foreground">{formatDateLocal(idea.data_aprovacao)}</span>
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
                            className="text-[#4b8655] underline max-w-full overflow-x-hidden break-all"
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
                      <div className="text-muted-foreground max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                        {p.legenda || "—"}
                      </div>
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
            {socialMediaModerationVisible && (
              <div className="mt-3 grid gap-2">
                <Textarea
                  placeholder="Comentário (obrigatório para ajustar)"
                  value={comment}
                  onChange={(e) => setComments((c) => ({ ...c, [p.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button
                    className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]"
                    onClick={() => handleSocialMediaApproval(p, true, comment)}
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500"
                    onClick={async () => {
                      if (!comment.trim()) {
                        toast({ title: "Comentário é obrigatório para ajustar", variant: "destructive" })
                        return
                      }
                      setAdjustDialog({ pub: p, comment })
                    }}
                  >
                    Ajustar
                  </Button>
                </div>
              </div>
            )}
            {isClient && p.status === "publicacao_em_aprovacao" && (
              <div className="mt-3 grid gap-2">
                <Textarea
                  placeholder="Comentário (opcional para aprovação, obrigatório para ajuste)"
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
                    variant="outline"
                    className="bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (comment.trim() || hasMediaComments(p.id)) {
                        setConfirmDialog({
                          aberto: true,
                          tipo: "ajustar",
                          pub: p,
                          comentario: comment.trim(),
                        })
                      } else {
                        setCommentRequiredDialog({
                          aberto: true,
                          tipo: "ajustar",
                          pub: p,
                          comentario: "",
                        })
                      }
                    }}
                  >
                    Ajustar
                  </Button>
                </div>
              </div>
            )}
            {canManage &&
            p.status === "publicacao_em_alteracao" &&
            p.comentarios_midias &&
            p.comentarios_midias.length > 0 ? (
              <div className="mb-2 rounded border bg-orange-50 border-orange-200 p-3">
                <div className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentários das Mídias
                </div>
                <div className="space-y-2">
                  {p.comentarios_midias.map((comentarioMidia, idx) => (
                    <div key={idx} className="bg-white rounded border border-orange-200 p-2">
                      <div className="text-xs font-medium text-orange-700 mb-1">
                        Mídia {comentarioMidia.midia_index + 1}
                      </div>
                      <div className="text-sm text-gray-700 max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                        {comentarioMidia.comentario}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
      {preview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 text-2xl"
              onClick={() => setPreview(null)}
            >
              ✕
            </button>

            {(() => {
              const mediaPaths =
                preview.pub.midia_urls && preview.pub.midia_urls.length > 0
                  ? preview.pub.midia_urls
                  : preview.pub.midia_url
                    ? [preview.pub.midia_url]
                    : []
              const isCarrossel = preview.pub.formato === "Carrossel" && mediaPaths.length > 1
              const currentIndex = preview.index
              const totalMedia = mediaPaths.length

              const goToPrevious = () => {
                const newIndex = currentIndex > 0 ? currentIndex - 1 : totalMedia - 1
                setPreview({ pub: preview.pub, index: newIndex })
              }

              const goToNext = () => {
                const newIndex = currentIndex < totalMedia - 1 ? currentIndex + 1 : 0
                setPreview({ pub: preview.pub, index: newIndex })
              }

              const result = computePreviewUrl(preview.pub, preview.index)
              if (!result) return <div className="text-white">Mídia não encontrada</div>
              const { url, isVideo } = result

              const currentComment = mediaComments[preview.pub.id]?.[currentIndex] || ""
              const handleCommentChange = (comment: string) => {
                setMediaComments((prev) => ({
                  ...prev,
                  [preview.pub.id]: {
                    ...prev[preview.pub.id],
                    [currentIndex]: comment,
                  },
                }))
              }

              return (
                <div className="relative w-full h-full flex flex-col">
                  {/* Área da mídia */}
                  <div className="flex-1 flex items-center justify-center relative">
                    {/* Setas de navegação para carrossel */}
                    {isCarrossel && (
                      <>
                        <button
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            goToPrevious()
                          }}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            goToNext()
                          }}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    )}

                    {/* Conteúdo da mídia */}
                    {isVideo ? (
                      <video
                        src={url}
                        controls
                        className="max-w-full max-h-[70vh]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <img
                        src={url || "/placeholder.svg"}
                        alt="Preview"
                        className="max-w-full max-h-[70vh] object-contain"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}

                    {/* Indicador de posição para carrossel */}
                    {isCarrossel && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                        {mediaPaths.map((_, index) => (
                          <button
                            key={index}
                            className={`w-2 h-2 rounded-full ${index === currentIndex ? "bg-white" : "bg-white/50"}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreview({ pub: preview.pub, index })
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Contador de mídia para carrossel */}
                    {isCarrossel && (
                      <div className="absolute top-4 left-4 text-white bg-black/50 px-3 py-1 rounded">
                        {currentIndex + 1} / {totalMedia}
                      </div>
                    )}
                  </div>

                  {isClient && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200">
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-gray-800">
                            Comentário {isCarrossel ? `- Mídia ${currentIndex + 1} de ${totalMedia}` : ""}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Descreva suas observações sobre esta mídia..."
                            value={currentComment}
                            onChange={(e) => handleCommentChange(e.target.value)}
                            className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm resize-none transition-colors"
                            rows={3}
                          />
                          {currentComment && (
                            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-100 px-3 py-2 rounded-lg">
                              <CheckCircle className="h-3 w-3" />
                              <span>Comentário salvo. Será enviado junto com sua avaliação da publicação.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}
      {adjustDialog && (
        <Dialog open={!!adjustDialog} onOpenChange={() => setAdjustDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Ajustes</DialogTitle>
              <DialogDescription>Tem certeza que deseja solicitar ajustes nesta publicação?</DialogDescription>
            </DialogHeader>

            {/* Show media comments if any */}
            {(() => {
              const comentariosMidias = mediaComments[adjustDialog.pub.id] || {}
              const hasMediaComments = Object.values(comentariosMidias).some((c) => c.trim())

              if (hasMediaComments) {
                return (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Comentários nas mídias:</p>
                    {Object.entries(comentariosMidias)
                      .filter(([_, comentario]) => comentario.trim())
                      .map(([midiaIndex, comentario]) => (
                        <div key={midiaIndex} className="text-sm bg-gray-50 p-2 rounded">
                          <strong>Mídia {Number.parseInt(midiaIndex) + 1}:</strong> {comentario}
                        </div>
                      ))}
                  </div>
                )
              }
              return null
            })()}

            <div className="space-y-2">
              <p className="text-sm font-medium">Comentário geral:</p>
              <div className="text-sm bg-gray-50 p-2 rounded">{adjustDialog.comment}</div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialog(null)}>
                Cancelar
              </Button>
              <Button
                className="bg-yellow-500 text-white hover:bg-yellow-600"
                onClick={async () => {
                  const { pub, comment } = adjustDialog

                  const comentariosMidias = mediaComments[adjustDialog.pub.id] || {}
                  const comentariosMidiasArray = Object.entries(comentariosMidias)
                    .filter(([_, comentario]) => comentario.trim())
                    .map(([midiaIndex, comentario]) => ({
                      midia_index: Number.parseInt(midiaIndex),
                      comentario: comentario.trim(),
                    }))

                  const comentarioObj = {
                    texto: comment.trim(),
                    autor: "Cliente",
                    created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
                  }

                  const updated: Publicacao = {
                    ...pub,
                    status: "publicacao_em_alteracao",
                    comentarios: [...(pub.comentarios || []), comentarioObj],
                  }

                  onUpdated(updated)

                  if (pub.status === "em_design") {
                    setFazendoAgora((prev) => ({ ...prev, [pub.id]: false }))
                  }

                  try {
                    const payload = buildPublicationUpdatePayload(updated, {
                      comentario: comment.trim(),
                      comentarios_midias: comentariosMidiasArray,
                    })

                    await bridge("publicacoes", "update_reprovado", payload)
                    toast({ title: "Publicação enviada para ajustes" })
                    setComments((c) => ({ ...c, [pub.id]: "" }))
                    setAdjustDialog(null)
                  } catch (error) {
                    onUpdated(pub)
                    toast({ title: "Erro ao enviar ajustes", variant: "destructive" })
                  }
                }}
              >
                Confirmar Ajustes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Dialog
        open={commentRequiredDialog.aberto}
        onOpenChange={(o) => {
          if (!o) {
            setCommentRequiredDialog({ aberto: false, tipo: null, pub: null, comentario: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comentário obrigatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para solicitar ajustes é necessário deixar um comentário explicando o que deve ser alterado.
            </p>
            <Textarea
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
              onClick={() => setCommentRequiredDialog({ aberto: false, tipo: null, pub: null, comentario: "" })}
            >
              Cancelar
            </Button>
            <Button type="button" className="bg-yellow-600 hover:bg-yellow-700" onClick={handleConfirmCommentRequired}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDialog.aberto}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmDialog({ aberto: false, tipo: null, pub: null, comentario: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar solicitação de ajuste</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Tem certeza que deseja solicitar ajustes nesta publicação?</p>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm font-medium mb-1">Seu comentário:</p>
              <p className="text-sm text-gray-700">{confirmDialog.comentario}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDialog({ aberto: false, tipo: null, pub: null, comentario: "" })}
            >
              Não
            </Button>
            <Button type="button" className="bg-yellow-600 hover:bg-yellow-700" onClick={handleConfirmWithComment}>
              Sim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
