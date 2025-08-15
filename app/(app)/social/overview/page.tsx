"use client"

import React from "react"

import { PageShell } from "@/components/page-shell"
import { useAppState } from "@/stores/app-state"
import { useResumoSocialMedia } from "@/features/social/hooks/use-resumo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-client"
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Instagram,
  Facebook,
  Linkedin,
  Music,
  XCircle,
  Palette,
  Play,
} from "lucide-react"

export default function SocialOverviewPage() {
  const { cliente, periodo } = useAppState()
  const { user } = useAuth()

  const clienteIdForFetch = user?.role === "cliente" ? user.cliente_id : (cliente?.id ?? null)
  const { data, loading, error } = useResumoSocialMedia(clienteIdForFetch, periodo)

  const totalIdeias = data?.totalIdeias ?? 0
  const ideiasAprovadas = data?.statusIdeias?.aprovada ?? 0
  const taxaAprovacao = totalIdeias > 0 ? Math.round((ideiasAprovadas / totalIdeias) * 100) : 0

  const plataformasIcons = {
    Instagram: Instagram,
    Facebook: Facebook,
    LinkedIn: Linkedin,
    TikTok: Music,
    YouTube: Play, // Adicionando YouTube com ícone Play
  }

  const plataformas = data?.distribuicaoPlataformas?.map((plat) => ({
    ...plat,
    icon: plataformasIcons[plat.nome as keyof typeof plataformasIcons] || Instagram,
  })) ?? [
    { nome: "Instagram", icon: Instagram, valor: 0, porcentagem: "0%" },
    { nome: "Facebook", icon: Facebook, valor: 0, porcentagem: "0%" },
    { nome: "LinkedIn", icon: Linkedin, valor: 0, porcentagem: "0%" },
    { nome: "TikTok", icon: Music, valor: 0, porcentagem: "0%" },
    { nome: "YouTube", icon: Play, valor: 0, porcentagem: "0%" }, // Adicionando YouTube como fallback
  ]

  return (
    <PageShell title="Visão Geral">
      <p className="text-sm text-muted-foreground mb-6">Dashboard de agosto de 2025</p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ideias</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : (data?.totalIdeias ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando..." : `${data?.aguardandoAprovacao ?? 0} aguardando aprovação`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicações</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : (data?.statusPublicacoes?.publicada ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Carregando..." : `${data?.statusPublicacoes?.publicada ?? 0} já publicadas`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts do Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : (data?.publicacoesNoMes ?? 0)}</div>
            <p className="text-xs text-muted-foreground">agosto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${taxaAprovacao}%`}</div>
            <p className="text-xs text-muted-foreground">aprovação geral</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status das Ideias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Em Aprovação</span>
                </div>
                <span className="text-sm font-medium">{data?.statusIdeias?.ideia_em_aprovacao ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Em Alteração</span>
                </div>
                <span className="text-sm font-medium">{data?.statusIdeias?.ideia_em_alteracao ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Reprovada</span>
                </div>
                <span className="text-sm font-medium">{data?.statusIdeias?.reprovada ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Plataforma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plataformas.map((plataforma) => (
                <div key={plataforma.nome} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {React.createElement(plataforma.icon, { className: "h-4 w-4 text-muted-foreground" })}
                    <span className="text-sm">{plataforma.nome}</span>
                  </div>
                  <span className="text-sm font-medium">{plataforma.valor}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status das Publicações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Em Design</span>
                </div>
                <span className="text-sm font-medium">{data?.statusPublicacoes?.em_design ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Em Aprovação</span>
                </div>
                <span className="text-sm font-medium">{data?.statusPublicacoes?.em_aprovacao ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Em Alteração</span>
                </div>
                <span className="text-sm font-medium">{data?.statusPublicacoes?.em_alteracao ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Aprovado</span>
                </div>
                <span className="text-sm font-medium">{data?.statusPublicacoes?.aprovada ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Publicado</span>
                </div>
                <span className="text-sm font-medium">{data?.statusPublicacoes?.publicada ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clientes Mais Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente ativo ainda</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
