"use client"
import type { ColumnDef } from "@tanstack/react-table"
import type { Publicacao } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"

export function publicacaoColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (row: Publicacao) => void
  onDelete: (row: Publicacao) => void
}): ColumnDef<Publicacao>[] {
  return [
    { accessorKey: "titulo", header: "Título" },
    { accessorKey: "plataforma", header: "Plataforma" },
    { accessorKey: "formato", header: "Formato" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = String(getValue())
        const color =
          v === "em_design"
            ? "bg-blue-100 text-blue-900"
            : v.includes("aprov")
              ? "bg-yellow-100 text-yellow-900"
              : v.includes("agendada")
                ? "bg-blue-100 text-blue-900"
                : v.includes("publicada")
                  ? "bg-green-100 text-green-900"
                  : v.includes("alteracao")
                    ? "bg-amber-100 text-amber-900"
                    : "bg-slate-100 text-slate-900"
        return <Badge className={color}>{v}</Badge>
      },
    },
    { accessorKey: "data_agendada", header: "Data Agendada" },
    { accessorKey: "data_postagem", header: "Data Postagem" },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => onEdit(r)} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={() => onDelete(r)} aria-label="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]
}
