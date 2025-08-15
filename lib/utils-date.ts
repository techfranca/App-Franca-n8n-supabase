export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
}

export function firstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function isoNow(): string {
  return new Date().toISOString()
}

export function ymd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function formatDateLocal(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR")
  } catch {
    return "—"
  }
}

export function formatDateTimeLocal(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  try {
    const date = new Date(dateString)
    return date.toLocaleString("pt-BR")
  } catch {
    return "—"
  }
}

export function formatTimeLocal(dateString: string | null | undefined): string {
  if (!dateString) return "—"

  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return ""

  try {
    const date = new Date(dateString)
    // Para inputs de data, precisamos do formato YYYY-MM-DD no fuso local
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch {
    return ""
  }
}
