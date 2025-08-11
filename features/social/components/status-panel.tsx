import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function StatusPanel({
  title,
  items,
}: {
  title: string
  items: { label: string; value: number; color?: string }[]
}) {
  return (
    <Card className="border-[#4b8655]/20">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between">
            <div className="text-sm">{it.label}</div>
            <Badge className={it.color ?? "bg-[#7de08d] text-[#081534]"}>{it.value}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
