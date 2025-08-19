"use client"

import { PageShell } from "@/components/page-shell"
import { FeedbackNotifications } from "@/components/feedback-notifications"
import { Montserrat } from "next/font/google"
import { getUser } from "@/lib/auth-client"
import { useEffect, useState } from "react"
import { bridge } from "@/lib/bridge"
import { ClientMaterialsUpload } from "@/components/client-materials-upload"
import { AdminClientRegister } from "@/components/admin-client-register"

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700"] })

export default function HomePage() {
  const user = getUser()
  const isAdminOrColaborador = user?.role === "admin" || user?.role === "colaborador" || user?.role === "social_media"
  const isClient = user?.role === "cliente"
  const isAdmin = user?.role === "admin"

  const [homeData, setHomeData] = useState<any>(null)
  const [feedbacks, setFeedbacks] = useState<any[]>([])

  const loadHomeData = async () => {
    try {
      console.log("[v0] Carregando dados da home...")
      const result = await bridge("home", "refresh", {})
      console.log("[v0] Dados da home recebidos:", result)

      if (result) {
        setHomeData(result)
        if (result.ideias && Array.isArray(result.ideias)) {
          setFeedbacks(result.ideias)
          console.log("[v0] Feedbacks encontrados:", result.ideias)
        }
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar dados da home:", error)
    }
  }

  useEffect(() => {
    loadHomeData()
  }, [])

  return (
    <PageShell title="Home">
      <div className="min-h-screen bg-white">
        {isAdminOrColaborador && (
          <div className="absolute top-4 right-4 z-10">
            <FeedbackNotifications feedbacks={feedbacks} onFeedbackRead={loadHomeData} />
          </div>
        )}

        <section className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 py-12">
          <div className="flex justify-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%201-KyYpDMvIcJBsu0FL3SKt1jSKC6YOeC.png"
              alt="FRANCA Assessoria Logo"
              className="w-36 h-36 object-contain"
            />
          </div>

          <h1 className={`${montserrat.className} text-4xl font-bold text-center`}>
            <span className="text-[#081534]">BEM VINDO À PLATAFORMA </span>
            <span className="text-[#7de08d]">FRANCA</span>
          </h1>

          <p className="text-gray-600 text-lg text-center max-w-2xl px-4">
            Sua central de gerenciamento de conteúdo e comunicação
          </p>
        </section>

        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className={`${montserrat.className} text-2xl font-semibold text-[#081534] text-center mb-8`}>
              Acesso Rápido
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isClient && <ClientMaterialsUpload />}
              {isAdmin && <AdminClientRegister />}

              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-400 text-sm">Funcionalidades em breve...</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
