"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MessageSquare, Bug, Lightbulb, Heart, HelpCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { bridge } from "@/lib/bridge"
import { getUser } from "@/lib/auth-client"
import { format } from "date-fns"

type FeedbackType = "problema_tecnico" | "melhoria" | "elogio" | "outro"

const feedbackOptions = [
  {
    value: "problema_tecnico" as FeedbackType,
    label: "Problema Técnico",
    icon: Bug,
    description: "Reportar bugs ou erros no sistema",
  },
  {
    value: "melhoria" as FeedbackType,
    label: "Melhoria",
    icon: Lightbulb,
    description: "Sugerir melhorias ou novas funcionalidades",
  },
  {
    value: "elogio" as FeedbackType,
    label: "Elogio",
    icon: Heart,
    description: "Compartilhar feedback positivo",
  },
  {
    value: "outro" as FeedbackType,
    label: "Outro",
    icon: HelpCircle,
    description: "Outros tipos de feedback",
  },
]

export function FeedbackDialog() {
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [selectedType, setSelectedType] = React.useState<FeedbackType>("melhoria")
  const [message, setMessage] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Por favor, escreva sua mensagem de feedback.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const user = getUser()
      const dataFeedback = format(new Date(), "yyyy-MM-dd HH:mm:ss")

      await bridge("feedbacks", "feedback_enviado", {
        tipo_feedback: selectedType,
        mensagem: message.trim(),
        cliente_id: user?.cliente_id || null,
        user_id: user?.id || null,
        user_name: user?.name || null,
        data_feedback: dataFeedback,
      })

      toast({
        title: "Feedback enviado!",
        description: "Obrigado pelo seu feedback. Nossa equipe irá analisá-lo em breve.",
      })

      setMessage("")
      setSelectedType("melhoria")
      setOpen(false)
    } catch (error) {
      console.error("[v0] Erro ao enviar feedback:", error)
      toast({
        title: "Erro ao enviar feedback",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton className="text-[#4b8655] hover:text-[#4b8655] hover:bg-green-50">
          <MessageSquare className="h-4 w-4" />
          <span>Enviar Feedback</span>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#081534] flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#4b8655]" />
            Enviar Feedback
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#081534]">Tipo de feedback</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as FeedbackType)}
              className="space-y-2"
            >
              {feedbackOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <div
                    key={option.value}
                    onClick={() => setSelectedType(option.value)}
                    className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={option.value}
                        className="flex items-center gap-2 text-sm font-medium text-[#081534] cursor-pointer"
                      >
                        <IconComponent className="h-4 w-4 text-[#4b8655]" />
                        {option.label}
                      </Label>
                      <p className="text-xs text-gray-600">{option.description}</p>
                    </div>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#081534]">Sua mensagem *</Label>
            <Textarea
              placeholder="Descreva seu feedback detalhadamente..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none text-sm"
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 text-right">{message.length}/1000 caracteres</div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]"
            >
              {submitting ? "Enviando..." : "Enviar Feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
