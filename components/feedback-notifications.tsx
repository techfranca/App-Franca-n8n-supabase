"use client"

import { useState } from "react"
import { Bell, MessageSquare, AlertTriangle, Lightbulb, Heart, HelpCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { bridge } from "@/lib/bridge"
import { format } from "date-fns" // Importando date-fns para formatação precisa

interface Feedback {
  id: string
  tipo_feedback: string
  mensagem: string
  cliente_id: string | null
  user_id: string
  user_name: string
  data_feedback: string
  status?: string // Adicionado campo status para controlar feedbacks lidos
}

interface FeedbackNotificationsProps {
  feedbacks?: Feedback[]
  onFeedbackRead?: () => void // Callback para atualizar lista após marcar como lido
}

const feedbackIcons = {
  problema_tecnico: AlertTriangle,
  melhoria: Lightbulb,
  elogio: Heart,
  outro: HelpCircle,
}

const feedbackColors = {
  problema_tecnico: "bg-red-100 text-red-800",
  melhoria: "bg-blue-100 text-blue-800",
  elogio: "bg-green-100 text-green-800",
  outro: "bg-gray-100 text-gray-800",
}

const feedbackLabels = {
  problema_tecnico: "Problema Técnico",
  melhoria: "Melhoria",
  elogio: "Elogio",
  outro: "Outro",
}

export function FeedbackNotifications({ feedbacks = [], onFeedbackRead }: FeedbackNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null) // Estado para controlar loading do botão
  const [showAll, setShowAll] = useState(false)
  const [allFeedbacks, setAllFeedbacks] = useState<Feedback[]>([])
  const [loadingAll, setLoadingAll] = useState(false)

  const unreadFeedbacks = feedbacks.filter((feedback) => feedback.status !== "lido")
  const displayFeedbacks = showAll ? allFeedbacks : unreadFeedbacks

  const handleShowAll = async () => {
    if (showAll) {
      setShowAll(false)
      return
    }

    try {
      setLoadingAll(true)
      console.log("[v0] Buscando feedbacks lidos...")

      const result = await bridge("home", "refresh_all", {})
      console.log("[v0] Feedbacks lidos recebidos:", result)

      if (result && result.ideias && Array.isArray(result.ideias)) {
        const readFeedbacks = result.ideias.filter((feedback: Feedback) => feedback.status === "lido")
        setAllFeedbacks(readFeedbacks)
        setShowAll(true)
      }
    } catch (error) {
      console.error("[v0] Erro ao buscar feedbacks lidos:", error)
    } finally {
      setLoadingAll(false)
    }
  }

  const handleMarkAsRead = async (feedbackId: string) => {
    try {
      setMarkingAsRead(feedbackId)
      console.log("[v0] Marcando feedback como lido:", feedbackId)

      await bridge("feedbacks", "marcar_lido", {
        id: feedbackId,
        status: "lido",
      })

      console.log("[v0] Feedback marcado como lido com sucesso")

      // Chamar callback para atualizar a lista
      if (onFeedbackRead) {
        onFeedbackRead()
      }
    } catch (error) {
      console.error("[v0] Erro ao marcar feedback como lido:", error)
    } finally {
      setMarkingAsRead(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      // Usar date-fns para formatação precisa no fuso local
      return format(date, "dd/MM/yyyy HH:mm")
    } catch (error) {
      console.error("[v0] Erro ao formatar data:", error)
      return dateString
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative bg-white border-gray-200 hover:bg-gray-50">
          <Bell className="h-4 w-4 text-[#081534]" />
          {unreadFeedbacks.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadFeedbacks.length}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-[#081534]">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedbacks dos Clientes ({showAll ? allFeedbacks.length : unreadFeedbacks.length})
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowAll}
              disabled={loadingAll}
              className="text-xs text-[#4b8655] hover:text-[#4b8655] hover:bg-green-50"
            >
              {loadingAll ? "..." : showAll ? "Apenas não lidos" : "Ver lidos"}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {displayFeedbacks.length > 0 ? (
            <div className="space-y-4 p-4">
              {displayFeedbacks.map((feedback) => {
                const Icon = feedbackIcons[feedback.tipo_feedback as keyof typeof feedbackIcons] || HelpCircle
                const colorClass =
                  feedbackColors[feedback.tipo_feedback as keyof typeof feedbackColors] || "bg-gray-100 text-gray-800"
                const label = feedbackLabels[feedback.tipo_feedback as keyof typeof feedbackLabels] || "Outro"
                const isRead = feedback.status === "lido"

                return (
                  <div
                    key={feedback.id}
                    className={`border rounded-lg p-4 shadow-sm ${isRead ? "bg-gray-50 opacity-75" : "bg-white"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>{label}</span>
                            {isRead && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Lido
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{formatDate(feedback.data_feedback)}</span>
                            {!isRead && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsRead(feedback.id)}
                                disabled={markingAsRead === feedback.id}
                                className="h-6 px-2 text-xs bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {markingAsRead === feedback.id ? "..." : "Arquivar"}
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className={`mb-2 ${isRead ? "text-gray-600" : "text-gray-800"}`}>{feedback.mensagem}</p>
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">{feedback.user_name}</span>
                          {feedback.cliente_id && <span className="ml-2">• Cliente: {feedback.cliente_id}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mb-4 text-gray-300" />
              <p>Nenhum feedback encontrado</p>
              <p className="text-sm">
                {showAll ? "Nenhum feedback disponível" : "Os feedbacks dos clientes aparecerão aqui"}
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
