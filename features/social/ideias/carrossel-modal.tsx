"use client"

import * as React from "react"
import { parseArtes } from "@/lib/parse-artes"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CarrosselModalProps {
  aberto: boolean
  textoCompleto: string
  onClose: () => void
  comentariosArtes?: Record<string, string>
  onComentarioArteChange?: (arteIndex: number, comentario: string) => void
}

export function CarrosselModal({
  aberto,
  textoCompleto,
  onClose,
  comentariosArtes = {},
  onComentarioArteChange,
}: CarrosselModalProps) {
  const { total, secoes } = parseArtes(textoCompleto)
  const [arteAtual, setArteAtual] = React.useState(0)

  // Reset ao abrir
  React.useEffect(() => {
    if (aberto) {
      setArteAtual(0)
    }
  }, [aberto])

  // Navegação por teclado
  React.useEffect(() => {
    if (!aberto) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        setArteAtual((prev) => Math.max(0, prev - 1))
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        setArteAtual((prev) => Math.min(secoes.length - 1, prev + 1))
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [aberto, secoes.length, onClose])

  if (!aberto || secoes.length === 0) return null

  const secaoAtual = secoes[arteAtual]
  const temAnterior = arteAtual > 0
  const temProximo = arteAtual < secoes.length - 1

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-3xl">Conteúdo do carrossel</DialogTitle>
            <Badge variant="outline">
              {total} {total === 1 ? "arte" : "artes"}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Navegação entre artes */}
          {secoes.length > 1 && (
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArteAtual((prev) => Math.max(0, prev - 1))}
                disabled={!temAnterior}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex items-center gap-2">
                {secoes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setArteAtual(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === arteAtual ? "bg-[#4b8655]" : "bg-gray-300",
                    )}
                    aria-label={`Ir para arte ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setArteAtual((prev) => Math.min(secoes.length - 1, prev + 1))}
                disabled={!temProximo}
                className="flex items-center gap-2"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Conteúdo da arte atual */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-3xl font-semibold">{secaoAtual.titulo}</h3>
              {secoes.length > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {arteAtual + 1} de {secoes.length}
                </Badge>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xl leading-relaxed max-w-full overflow-x-hidden whitespace-pre-wrap break-words">
                {secaoAtual.conteudo}
              </div>
            </div>

            {onComentarioArteChange && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  Comentário para {secaoAtual.titulo}
                </label>
                <Textarea
                  placeholder="Adicione um comentário específico para esta arte..."
                  value={comentariosArtes[arteAtual] || ""}
                  onChange={(e) => onComentarioArteChange(arteAtual, e.target.value)}
                  className="bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
                <p className="text-xs text-blue-600 mt-1">
                  Este comentário será enviado junto com sua avaliação da ideia.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
