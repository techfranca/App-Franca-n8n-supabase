"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface TextModalProps {
  aberto: boolean
  titulo: string
  conteudo: string
  onClose: () => void
}

export function TextModal({ aberto, titulo, conteudo, onClose }: TextModalProps) {
  // Navegação por teclado
  React.useEffect(() => {
    if (!aberto) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [aberto, onClose])

  if (!aberto) return null

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle>{titulo}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm leading-relaxed max-w-full overflow-x-hidden whitespace-pre-wrap break-words overflow-wrap-break-word">
              {conteudo || "Sem conteúdo"}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
