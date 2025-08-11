import { PageShell } from "@/components/page-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <PageShell title="Dashboard">
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo à Franca Insights</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Selecione uma seção no menu Social Media para começar.
        </CardContent>
      </Card>
    </PageShell>
  )
}
