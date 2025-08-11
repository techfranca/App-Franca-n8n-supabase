import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export function StatusBadge({
  status,
  map,
}: {
  status: string
  map: "ideia" | "publicacao"
}) {
  let label = status
  let cls = "bg-slate-100 text-slate-900"
  if (map === "ideia") {
    if (status === "ideia_em_aprovacao") {
      label = "Em Aprovação"
      cls = "bg-yellow-100 text-yellow-900"
    } else if (status === "ideia_em_alteracao") {
      label = "Em Alteração"
      cls = "bg-amber-100 text-amber-900"
    } else if (status === "em_design") {
      label = "Em Design"
      cls = "bg-blue-100 text-blue-900"
    } else if (status === "aprovada") {
      label = "Aprovada"
      cls = "bg-emerald-100 text-emerald-900"
    } else if (status === "reprovada") {
      label = "Reprovada"
      cls = "bg-red-100 text-red-900"
    } else if (status === "rascunho" || status === "ideia_criada") {
      label = status === "ideia_criada" ? "Criada" : "Rascunho"
      cls = "bg-slate-100 text-slate-900"
    }
  } else {
    if (status === "em_design") {
      label = "Em Design"
      cls = "bg-blue-100 text-blue-900"
    } else if (status === "publicacao_em_aprovacao") {
      label = "Em Aprovação"
      cls = "bg-yellow-100 text-yellow-900"
    } else if (status === "publicacao_em_alteracao") {
      label = "Em Alteração"
      cls = "bg-amber-100 text-amber-900"
    } else if (status === "aprovado") {
      label = "Aprovado"
      cls = "bg-emerald-100 text-emerald-900"
    } else if (status === "agendada") {
      label = "Agendada"
      cls = "bg-blue-100 text-blue-900"
    } else if (status === "publicada") {
      label = "Publicada"
      cls = "bg-green-100 text-green-900"
    }
  }
  return <Badge className={cn(cls)}>{label}</Badge>
}
