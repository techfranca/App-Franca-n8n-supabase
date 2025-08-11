"use client"

import { Button } from "@/components/ui/button"

export type ViewMode = "table" | "card" | "calendar"

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
}) {
  return (
    <div className="inline-flex rounded-md border overflow-hidden">
      <Button
        type="button"
        variant={mode === "table" ? "default" : "ghost"}
        className={mode === "table" ? "bg-[#7de08d] text-[#081534]" : ""}
        onClick={() => onChange("table")}
      >
        Tabela
      </Button>
      <Button
        type="button"
        variant={mode === "card" ? "default" : "ghost"}
        className={mode === "card" ? "bg-[#7de08d] text-[#081534]" : ""}
        onClick={() => onChange("card")}
      >
        Card
      </Button>
      <Button
        type="button"
        variant={mode === "calendar" ? "default" : "ghost"}
        className={mode === "calendar" ? "bg-[#7de08d] text-[#081534]" : ""}
        onClick={() => onChange("calendar")}
      >
        Calendário
      </Button>
    </div>
  )
}
