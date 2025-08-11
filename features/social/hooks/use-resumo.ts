"use client"

import { useEffect, useState } from "react"
import { bridge } from "@/lib/bridge"

export function useResumoSocialMedia(clienteId: string | null, periodo: { month: number; year: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    totalIdeias: number
    aguardandoAprovacao: number
    publicacoesNoMes: number
    emProducao: number
    clientesAtivosNoMes: number
    statusIdeias: { ideia_em_aprovacao: number; em_design: number; aprovada: number }
    statusPublicacoes: { publicacao_em_aprovacao: number; agendada: number; publicada: number }
    atividadeRecente: { tipo: string; autor: string; quando: string; label: string; href?: string }[]
  } | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        // bridge returns the data directly or throws on error
        const result = await bridge<
          any,
          {
            totalIdeias: number
            aguardandoAprovacao: number
            publicacoesNoMes: number
            emProducao: number
            clientesAtivosNoMes: number
            statusIdeias: { ideia_em_aprovacao: number; em_design: number; aprovada: number }
            statusPublicacoes: { publicacao_em_aprovacao: number; agendada: number; publicada: number }
            atividadeRecente: { tipo: string; autor: string; quando: string; label: string; href?: string }[]
          }
        >("social_resumo", "get", { clienteId, periodo })
        if (!mounted) return
        setData(result as any)
        setLoading(false)
      } catch (err: any) {
        if (!mounted) return
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
