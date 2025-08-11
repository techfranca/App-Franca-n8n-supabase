export function toCSV<T extends Record<string, any>>(rows: T[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const escape = (v: any) => {
    const s = v == null ? "" : String(v)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const out: string[] = []
  out.push(headers.join(","))
  for (const row of rows) {
    out.push(headers.map((h) => escape(row[h])).join(","))
  }
  return out.join("\n")
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.setAttribute("download", filename)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
