import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ActivityItem = {
  tipo: string
  autor: string
  quando: string
  label: string
  href?: string
}

export function ActivityTimeline({
  items = [],
}: {
  items?: ActivityItem[]
}) {
  const safeItems = Array.isArray(items) ? items : []

  return (
    <Card className="border-[#4b8655]/20">
      <CardHeader>
        <CardTitle className="text-sm">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {safeItems.length === 0 ? <div className="text-muted-foreground text-sm">Sem atividade ainda.</div> : null}
        {safeItems.map((ev, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-[#4b8655]" />
            <div className="grid">
              <div className="text-sm">
                <span className="font-medium">{ev.autor}</span> {ev.tipo} — {ev.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {ev?.quando ? new Date(ev.quando).toLocaleString("pt-BR") : "Data indisponível"}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
