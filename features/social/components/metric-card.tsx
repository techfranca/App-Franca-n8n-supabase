import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MetricCard({
  title,
  value,
  helper,
}: {
  title: string
  value: string | number
  helper?: string
}) {
  return (
    <Card className="border-[#4b8655]/20">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold text-[#081534]">{value}</div>
        {helper ? <div className="text-xs text-muted-foreground mt-1">{helper}</div> : null}
      </CardContent>
    </Card>
  )
}
