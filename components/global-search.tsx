"use client"
import { useAppState } from "@/stores/app-state"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export function GlobalSearch() {
  const { search, setSearch } = useAppState()
  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        aria-label="Busca global (Título/Ideia/Legenda)"
        placeholder="Buscar por Título / Ideia / Legenda"
        className="pl-8"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  )
}
