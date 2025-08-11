"use client"

import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, format } from "date-fns"
import ptBR from "date-fns/locale/pt-BR"
import { cn } from "@/lib/utils"

export type CalendarItem = {
  id: string
  title: string
  platform: string
  dateISO: string // ISO string da data de postagem
}

export function MonthCalendar({
  month,
  year,
  items,
  onSelectItem,
}: {
  month: number
  year: number
  items: CalendarItem[]
  onSelectItem: (id: string) => void
}) {
  const first = startOfMonth(new Date(year, month - 1, 1))
  const last = endOfMonth(first)
  const gridStart = startOfWeek(first, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(last, { weekStartsOn: 0 })

  const days: Date[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  function itemsByDate(d: Date) {
    const key = format(d, "yyyy-MM-dd")
    return items.filter((it) => it.dateISO && it.dateISO.startsWith(key))
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((w) => (
        <div key={w} className="text-xs text-muted-foreground px-1">
          {w}
        </div>
      ))}
      {days.map((d, i) => {
        const inMonth = isSameMonth(d, first)
        const dayItems = itemsByDate(d)
        return (
          <div
            key={i}
            className={cn(
              "min-h-[110px] rounded-md border p-2 flex flex-col gap-1",
              inMonth ? "bg-white" : "bg-slate-50",
            )}
          >
            <div className="text-xs text-muted-foreground">{format(d, "d", { locale: ptBR })}</div>
            <div className="flex flex-col gap-1 overflow-auto">
              {dayItems.map((it) => (
                <button
                  key={it.id}
                  className="text-left text-xs rounded bg-[#7de08d]/30 hover:bg-[#7de08d]/50 px-2 py-1"
                  onClick={() => onSelectItem(it.id)}
                  title={it.title}
                >
                  {it.title}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
