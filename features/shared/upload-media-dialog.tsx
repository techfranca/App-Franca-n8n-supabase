"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { UploadCloud, ImageIcon, VideoIcon, Crown, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { publicUrlFromPath } from "@/lib/public-url"
import { bridge } from "@/lib/bridge" // Importar a bridge
import { useToast } from "@/hooks/use-toast" // Importar o hook de toast

type FileItem = {
  file: File
  url: string
  kind: "image" | "video" | "other"
}

function kindOfFile(f: File): "image" | "video" | "other" {
  if (f.type.startsWith("image/")) return "image"
  if (f.type.startsWith("video/")) return "video"
  const name = f.name.toLowerCase()
  if (/\.(jpg|jpeg|png|webp)$/i.test(name)) return "image"
  if (/\.(mp4|mov|webm)$/i.test(name)) return "video"
  return "other"
}

export function UploadMediaDialog({
  open,
  onOpenChange,
  accept = ".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm",
  max = 10,
  initial,
  onUpsert,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  accept?: string
  max?: number
  initial?: { paths: string[]; coverPath?: string | null }
  onUpsert: (args: { newFiles: File[]; keptPaths: string[]; coverPath: string | null }) => Promise<void>
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [existing, setExisting] = React.useState<string[]>(initial?.paths ?? [])
  const [newItems, setNewItems] = React.useState<FileItem[]>([])
  const [progress, setProgress] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [selectedCover, setSelectedCover] = React.useState<string | null>(initial?.coverPath ?? null)
  const [dragOver, setDragOver] = React.useState(false)
  const [carouselIndex, setCarouselIndex] = React.useState(0)
  const { toast } = useToast() // Inicializar o toast

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    appendFiles(e.dataTransfer.files)
  }

  React.useEffect(() => {
    if (open) {
      setExisting(initial?.paths ?? [])
      setSelectedCover(initial?.coverPath ?? null)
      setNewItems([])
      setProgress(0)
      setSubmitting(false)
      setCarouselIndex(0)
    }
  }, [open, initial?.paths, initial?.coverPath])

  function appendFiles(files: FileList | File[] | null | undefined) {
    if (!files) return
    const arr = Array.from(files)
    const mapped: FileItem[] = arr.map((f) => ({ file: f, url: URL.createObjectURL(f), kind: kindOfFile(f) }))
    setNewItems((prev) => {
      const allowed = Math.max(0, max - (existing.length + prev.length))
      return [...prev, ...mapped.slice(0, allowed)]
    })
  }

  // --- MUDANÇA PRINCIPAL AQUI ---
  async function removeExisting(idx: number) {
    const pathToRemove = existing[idx]
    if (!pathToRemove) return

    try {
      // Chama o webhook para deletar o arquivo no Supabase
      await bridge("publicacoes", "delete_midia", { path: pathToRemove })
      
      toast({ title: "Mídia removida com sucesso!" })

      // Se a chamada for bem-sucedida, atualiza o estado local
      setExisting((prev) => {
        const next = prev.filter((_, i) => i !== idx)
        if (pathToRemove && selectedCover === pathToRemove) {
          setSelectedCover(next[0] ?? null)
        }
        return next
      })
      setCarouselIndex(Math.max(0, carouselIndex - 1))

    } catch (error: any) {
      toast({
        title: "Erro ao remover mídia",
        description: error.message || "Não foi possível apagar o arquivo no armazenamento.",
        variant: "destructive",
      })
    }
  }

  function removeNew(idx: number) {
    setNewItems((prev) => {
      const it = prev[idx]
      if (it) URL.revokeObjectURL(it.url)
      const next = prev.slice()
      next.splice(idx, 1)
      return next
    })
    setCarouselIndex(Math.max(0, carouselIndex - 1))
  }

  async function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    const id = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 12 + Math.random() * 10)
        if (next >= 100) clearInterval(id)
        return next
      })
    }, 160)

    try {
      await new Promise((r) => setTimeout(r, 300))
      await onUpsert({
        newFiles: newItems.map((i) => i.file),
        keptPaths: existing,
        coverPath: selectedCover,
      })
      onOpenChange(false)
    } catch {
      // manter aberto para tentar novamente
    } finally {
      setSubmitting(false)
    }
  }

  const totalCount = existing.length + newItems.length
  const canAddMore = totalCount < max
  const allMedia = [
    ...existing.map((p) => ({ url: p, type: "existing" })),
    ...newItems.map((i) => ({ url: i.url, type: "new" })),
  ]
  const currentMedia = allMedia[carouselIndex] || null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>
              Gerenciar mídias ({totalCount}/{max})
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]"
                onClick={handleConfirm}
                disabled={submitting || totalCount === 0}
                title={totalCount === 0 ? "Selecione ao menos 1 mídia" : "Salvar mídias"}
              >
                {submitting ? "Enviando..." : "Salvar mídias"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div
          className={cn(
            "rounded-md border border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors",
            dragOver ? "bg-slate-50 border-[#4b8655]" : "bg-white",
          )}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <UploadCloud className="h-8 w-8 text-[#4b8655] mb-2" />
          <div className="text-sm text-muted-foreground mb-3">Arraste arquivos aqui ou clique para selecionar</div>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={(e) => appendFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => inputRef.current?.click()}
            disabled={!canAddMore}
            title={!canAddMore ? "Limite atingido" : "Selecionar arquivo(s)"}
          >
            Selecionar arquivo(s)
          </Button>

          <div className="text-xs text-muted-foreground mt-2">
            Formatos aceitos: {accept} · máx. {max} arquivos
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Mídias</div>
          <div className="relative">
            <div className="flex items-center justify-between absolute z-10 top-1/2 left-0 right-0 -translate-y-1/2">
              <Button
                variant="ghost"
                size="icon"
                className={cn("bg-white/80 hover:bg-white", carouselIndex === 0 && "opacity-50 cursor-not-allowed")}
                onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                disabled={carouselIndex === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "bg-white/80 hover:bg-white",
                  carouselIndex === allMedia.length - 1 && "opacity-50 cursor-not-allowed",
                )}
                onClick={() => setCarouselIndex(Math.min(allMedia.length - 1, carouselIndex + 1))}
                disabled={carouselIndex === allMedia.length - 1}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {allMedia.length > 0 && currentMedia ? (
              <div key={carouselIndex} className="rounded border p-2 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {currentMedia.type === "new" ? (
                      newItems[carouselIndex - existing.length]?.kind === "image" ? (
                        <ImageIcon className="h-3.5 w-3.5" />
                      ) : (
                        <VideoIcon className="h-3.5 w-3.5" />
                      )
                    ) : null}
                    <span className="truncate max-w-[150px]">
                      {currentMedia.type === "existing"
                        ? currentMedia.url
                        : newItems[carouselIndex - existing.length]?.file.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="text-red-600 hover:underline inline-flex items-center gap-1"
                      onClick={() => {
                        if (currentMedia.type === "existing") removeExisting(carouselIndex)
                        else removeNew(carouselIndex - existing.length)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      remover
                    </button>
                  </div>
                </div>
                <div className="rounded bg-slate-50 p-1">
                  {currentMedia.url.toLowerCase().match(/\.(mp4|mov|webm)(\?|#|$)/i) ? (
                    <video
                      src={publicUrlFromPath(currentMedia.url) || ""}
                      className="w-full h-28 object-contain rounded"
                      muted
                    />
                  ) : (
                    <img
                      src={
                        publicUrlFromPath(currentMedia.url) ||
                        "/placeholder.svg?height=200&width=200&query=midia-existente"
                      }
                      alt="Mídia"
                      className="w-full h-28 object-cover rounded"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).src = "/placeholder.svg?height=200&width=200"
                      }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCover(currentMedia.url)}
                  className={cn(
                    "w-full text-xs rounded border px-2 py-1",
                    selectedCover === currentMedia.url ? "border-emerald-600 text-emerald-700" : "border-slate-200",
                  )}
                  title="Definir como capa"
                >
                  <div className="inline-flex items-center gap-1">
                    <Crown className="h-3.5 w-3.5" />
                    {selectedCover === currentMedia.url ? "Capa selecionada" : "Definir como capa"}
                  </div>
                </button>
              </div>
            ) : (
              <div className="rounded border p-6 text-center text-muted-foreground">Sem mídias para exibir.</div>
            )}
          </div>
        </div>

        {progress > 0 && progress < 100 ? <Progress value={progress} className="h-2 mt-3" /> : null}
      </DialogContent>
    </Dialog>
  )
}
