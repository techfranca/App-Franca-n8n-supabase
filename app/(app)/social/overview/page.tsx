"use client"

import { PageShell } from "@/components/page-shell"
import { useAppState } from "@/stores/app-state"
import { useResumoSocialMedia } from "@/features/social/hooks/use-resumo"
import { MetricCard } from "@/features/social/components/metric-card"
import { StatusPanel } from "@/features/social/components/status-panel"
import { ActivityTimeline } from "@/features/social/components/activity-timeline"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-client"

export default function SocialOverviewPage() {
  const { cliente, periodo } = useAppState()
  const { user } = useAuth()

  const clienteIdForFetch = user?.role === "cliente" ? user.cliente_id : (cliente?.id ?? null)
  const { data, loading, error } = useResumoSocialMedia(clienteIdForFetch, periodo)

  return (
    <PageShell title="Social Media · Visão Geral">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total de Ideias"
          value={loading ? "..." : (data?.totalIdeias ?? 0)}
          helper={loading ? "Carregando..." : `${data?.aguardandoAprovacao ?? 0} aguardando aprovação`}
        />
        <MetricCard title="Publicações (mês)" value={loading ? "..." : (data?.publicacoesNoMes ?? 0)} />
        <MetricCard title="Em Produção" value={loading ? "..." : (data?.emProducao ?? 0)} />
        <MetricCard title="Clientes Ativos (mês)" value={loading ? "..." : (data?.clientesAtivosNoMes ?? 0)} />
      </div>

      <div className="grid gap-4 mt-4 md:grid-cols-3">
        <div className="md:col-span-2 grid gap-4">
          <ActivityTimeline items={loading || !data ? [] : data.atividadeRecente} />
        </div>
        <div className="grid gap-4">
          <StatusPanel
            title="Status das Ideias"
            items={[
              { label: "Em aprovação", value: data?.statusIdeias?.ideia_em_aprovacao ?? 0 },
              { label: "Em design", value: data?.statusIdeias?.em_design ?? 0 },
              { label: "Aprovada", value: data?.statusIdeias?.aprovada ?? 0 },
            ]}
          />
          <StatusPanel
            title="Status das Publicações"
            items={[
              { label: "Em aprovação", value: data?.statusPublicacoes?.publicacao_em_aprovacao ?? 0 },
              { label: "Agendada", value: data?.statusPublicacoes?.agendada ?? 0 },
              { label: "Publicada", value: data?.statusPublicacoes?.publicada ?? 0 },
            ]}
          />
        </div>
      </div>

      {error ? <Card className="p-4 text-sm mt-4 text-red-600 border-red-200">{error}</Card> : null}
    </PageShell>
  )
}
