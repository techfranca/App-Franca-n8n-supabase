"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Ideia } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"

export function ideiaColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (row: Ideia) => void
  onDelete: (row: Ideia) => void
}): ColumnDef<Ideia>[] {
  return [
    { accessorKey: "titulo", header: "Título" },
    { accessorKey: "plataforma", header: "Plataforma" },
    { accessorKey: "formato", header: "Formato" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const val = String(getValue())
        const color = val.includes("aprov")
          ? "bg-emerald-100 text-emerald-900"
          : val.includes("design")
            ? "bg-amber-100 text-amber-900"
            : val.includes("rascunho")
              ? "bg-slate-100 text-slate-900"
              : "bg-[#7de08d] text-[#081534]"
        return <Badge className={color}>{val}</Badge>
      },
    },
    { accessorKey: "data_aprovacao", header: "Data Aprovação" },
    { accessorKey: "data_publicacao", header: "Data Publicação" },
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
