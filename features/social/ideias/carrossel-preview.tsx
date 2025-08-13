"use client"
import { parseArtes, truncateText } from "@/lib/parse-artes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CarrosselPreviewProps {
  textoCompleto: string
  onVerTudo: () => void
}

export function CarrosselPreview({ textoCompleto, onVerTudo }: CarrosselPreviewProps) {
  const { total, secoes } = parseArtes(textoCompleto)

  // Se não há conteúdo suficiente, não mostra preview especial
  if (!textoCompleto?.trim() || textoCompleto.length < 100) {
    return <div className="text-muted-foreground font-bold">{textoCompleto || "—"}</div>
  }

  // Gera preview: primeiras 2 seções ou truncamento simples
  let previewText = ""

  if (total > 0 && secoes.length > 0) {
    // Mostra as duas primeiras seções
    const primeirasSecoes = secoes.slice(0, 2)
    previewText = primeirasSecoes.map((secao) => `${secao.titulo}:\n${secao.conteudo}`).join("\n\n")

    // Se há mais seções, adiciona indicador
    if (secoes.length > 2) {
      previewText += "\n..."
    }
  } else {
    // Fallback: truncamento simples
    previewText = truncateText(textoCompleto, 180)
  }

  return (
    <div className="space-y-2">
      {/* Badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          Carrossel
        </Badge>
        {total > 1 && (
          <Badge variant="outline" className="text-xs">
            {total} artes
          </Badge>
        )}
      </div>

      {/* Preview do texto */}
      <div className="text-muted-foreground font-bold whitespace-pre-wrap line-clamp-4">{previewText}</div>

      {/* Link "Ver tudo" */}
      <div className="flex justify-end">
        <Button variant="link" size="sm" onClick={onVerTudo} className="text-[#4b8655] p-0 h-auto text-xs">
          Ver tudo
        </Button>
      </div>
    </div>
  )
}
