"use client"

import { useEffect, useState } from "react"
import { bridge } from "@/lib/bridge"
import { getUser } from "@/lib/auth-client"

interface IdeiaRaw {
  id: string
  cliente_id: string
  status: string
  dataaprovacao: string | null
  datapostagem: string | null
  plataforma?: string
  [key: string]: any
}

interface PublicacaoRaw {
  id: string
  cliente_id: string
  status: string
  dataaprovacao: string | null
  datapostagem: string | null
  plataforma?: string
  [key: string]: any
}

interface DadosBrutos {
  ideias: IdeiaRaw[]
  publicacoes: PublicacaoRaw[]
}

function processarDados(dadosBrutos: any, periodo: { month: number; year: number }) {
  console.log("Dados recebidos:", dadosBrutos)

  const user = getUser()
  const isCliente = user?.role === "cliente" && user?.cliente_id

  // Verificar se dadosBrutos é um array
  let dados: DadosBrutos[]

  if (Array.isArray(dadosBrutos)) {
    dados = dadosBrutos
  } else if (dadosBrutos && typeof dadosBrutos === "object") {
    // Se for um objeto único, transformar em array
    dados = [dadosBrutos]
  } else {
    // Se não for nem array nem objeto, retornar dados vazios
    console.warn("Dados inválidos recebidos:", dadosBrutos)
    dados = []
  }

  // Combinar todos os dados de todos os clientes
  let todasIdeias = dados.flatMap((item) => item.ideias || [])
  let todasPublicacoes = dados.flatMap((item) => item.publicacoes || [])

  if (isCliente) {
    todasIdeias = todasIdeias.filter((ideia) => ideia.cliente_id === user.cliente_id)
    todasPublicacoes = todasPublicacoes.filter((pub) => pub.cliente_id === user.cliente_id)
  }

  // Contar status das ideias
  const statusIdeias = {
    ideia_em_aprovacao: todasIdeias.filter((i) => i.status === "ideia_em_aprovacao").length,
    em_design: todasIdeias.filter((i) => i.status === "em_design").length,
    aprovada: todasIdeias.filter((i) => i.status === "aprovada").length,
    ideia_em_alteracao: todasIdeias.filter((i) => i.status === "ideia_em_alteracao").length,
    reprovada: todasIdeias.filter((i) => i.status === "reprovada").length,
  }

  // Contar status das publicações
  const statusPublicacoes = {
    publicacao_em_aprovacao: todasPublicacoes.filter((p) => p.status === "publicacao_em_aprovacao").length,
    agendada: todasPublicacoes.filter((p) => p.status === "agendada").length,
    publicada: todasPublicacoes.filter((p) => p.status === "publicada").length,
    em_design: todasPublicacoes.filter((p) => p.status === "em_design").length,
  }

  // Calcular métricas gerais
  const totalIdeias = todasIdeias.length
  const aguardandoAprovacao = statusIdeias.ideia_em_aprovacao
  const emProducao = statusIdeias.em_design + statusPublicacoes.em_design

  // Publicações do mês atual
  const publicacoesNoMes = todasPublicacoes.filter((p) => {
    if (!p.datapostagem) return false
    const data = new Date(p.datapostagem)
    return data.getMonth() + 1 === periodo.month && data.getFullYear() === periodo.year
  }).length

  const clientesAtivosNoMes = isCliente
    ? 1
    : new Set([
        ...todasIdeias
          .filter((i) => {
            if (!i.dataaprovacao) return false
            const data = new Date(i.dataaprovacao)
            return data.getMonth() + 1 === periodo.month && data.getFullYear() === periodo.year
          })
          .map((i) => i.cliente_id),
        ...todasPublicacoes
          .filter((p) => {
            if (!p.datapostagem) return false
            const data = new Date(p.datapostagem)
            return data.getMonth() + 1 === periodo.month && data.getFullYear() === periodo.year
          })
          .map((p) => p.cliente_id),
      ]).size

  const plataformasCount = {
    Instagram: 0,
    Facebook: 0,
    LinkedIn: 0,
    TikTok: 0,
    YouTube: 0,
  }

  // Contar plataformas das ideias
  todasIdeias.forEach((ideia) => {
    if (ideia.plataforma) {
      const plataforma = ideia.plataforma.toString()
      if (plataforma.toLowerCase().includes("instagram")) plataformasCount.Instagram++
      else if (plataforma.toLowerCase().includes("facebook")) plataformasCount.Facebook++
      else if (plataforma.toLowerCase().includes("linkedin")) plataformasCount.LinkedIn++
      else if (plataforma.toLowerCase().includes("tiktok")) plataformasCount.TikTok++
      else if (plataforma.toLowerCase().includes("youtube")) plataformasCount.YouTube++
    }
  })

  // Contar plataformas das publicações
  todasPublicacoes.forEach((pub) => {
    if (pub.plataforma) {
      const plataforma = pub.plataforma.toString()
      if (plataforma.toLowerCase().includes("instagram")) plataformasCount.Instagram++
      else if (plataforma.toLowerCase().includes("facebook")) plataformasCount.Facebook++
      else if (plataforma.toLowerCase().includes("linkedin")) plataformasCount.LinkedIn++
      else if (plataforma.toLowerCase().includes("tiktok")) plataformasCount.TikTok++
      else if (plataforma.toLowerCase().includes("youtube")) plataformasCount.YouTube++
    }
  })

  const totalPlataformas = Object.values(plataformasCount).reduce((sum, count) => sum + count, 0)

  const distribuicaoPlataformas = Object.entries(plataformasCount).map(([nome, valor]) => ({
    nome,
    valor,
    porcentagem: totalPlataformas > 0 ? `${Math.round((valor / totalPlataformas) * 100)}%` : "0%",
  }))

  // Atividade recente (últimas 10 ações)
  const atividadeRecente = [
    ...todasIdeias.map((i) => ({
      tipo: "ideia",
      autor: i.cliente_id,
      quando: i.dataaprovacao || i.datapostagem || new Date().toISOString(),
      label: `Ideia: ${i.titulo || "Sem título"}`,
      href: `/social/ideias`,
    })),
    ...todasPublicacoes.map((p) => ({
      tipo: "publicacao",
      autor: p.cliente_id,
      quando: p.dataaprovacao || p.datapostagem || new Date().toISOString(),
      label: `Publicação: ${p.titulo || "Sem título"}`,
      href: `/social/publicacoes`,
    })),
  ]
    .sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime())
    .slice(0, 10)

  return {
    totalIdeias,
    aguardandoAprovacao,
    publicacoesNoMes,
    emProducao,
    clientesAtivosNoMes,
    statusIdeias,
    statusPublicacoes,
    distribuicaoPlataformas,
    atividadeRecente,
  }
}

export function useResumoSocialMedia(clienteId: string | null, periodo: { month: number; year: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    totalIdeias: number
    aguardandoAprovacao: number
    publicacoesNoMes: number
    emProducao: number
    clientesAtivosNoMes: number
    statusIdeias: {
      ideia_em_aprovacao: number
      em_design: number
      aprovada: number
      ideia_em_alteracao: number
      reprovada: number
    }
    statusPublicacoes: { publicacao_em_aprovacao: number; agendada: number; publicada: number; em_design: number }
    distribuicaoPlataformas: { nome: string; valor: number; porcentagem: string }[]
    atividadeRecente: { tipo: string; autor: string; quando: string; label: string; href?: string }[]
  } | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const result = await bridge<any, any>("social_resumo", "get", { clienteId, periodo })
        if (!mounted) return

        const dadosProcessados = processarDados(result, periodo)
        setData(dadosProcessados)
        setLoading(false)
      } catch (err: any) {
        if (!mounted) return
        console.error("Erro ao carregar resumo:", err)
        setError(err?.message ?? "Falha ao carregar")
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [clienteId, periodo])

  return { loading, error, data }
}
