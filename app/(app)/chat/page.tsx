"use client"

import React from "react"
import { getUser } from "@/lib/auth-client"
import { PageShell } from "@/components/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  user: {
    id: string
    name: string
  }
  text: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [newMessage, setNewMessage] = React.useState("")
  const user = getUser()

  const fetchMessages = async () => {
    // Implementação vazia por enquanto
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    // Implementação vazia por enquanto
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(date)
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <PageShell title="Chat">
      <Card className="flex flex-col h-[calc(100vh-100px)]">
        <CardContent className="flex-grow flex flex-col p-4">
          <ScrollArea className="flex-grow pr-4">
            <div className="space-y-4">
              {messages.map((msg) => {
                const isCurrentUser = msg.user.id === user?.id
                return (
                  <div key={msg.id} className={`flex gap-3 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                    {!isCurrentUser && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getUserInitials(msg.user.name)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[70%] ${isCurrentUser ? "order-first" : ""}`}>
                      <div
                        className={`rounded-lg p-3 ${
                          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {!isCurrentUser && <div className="font-semibold text-sm mb-1">{msg.user.name}</div>}
                        <div className="text-sm">{msg.text}</div>
                        <div
                          className={`text-xs mt-1 ${
                            isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {formatTimestamp(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                    {isCurrentUser && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getUserInitials(user?.name || "")}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>

        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1"
            />
            <Button type="submit" disabled={!newMessage.trim()}>
              Enviar
            </Button>
          </form>
        </div>
      </Card>
    </PageShell>
  )
}
