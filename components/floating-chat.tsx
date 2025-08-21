"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, Minimize2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUser } from "@/lib/auth-client"
import { bridge } from "@/lib/bridge"
import type { AuthUser } from "@/lib/types"

interface Message {
  id: string
  user_id: string
  user_name: string
  mensagem: string
  data_mensagem: string
  read: boolean
  mentions?: string[]
  readByMentioned?: boolean
  atualizacao?: string | null // Alterado de lido para atualizacao para consistência com o backend
}

const ADMIN_USERS = [
  { id: "user_leonardo", name: "Leonardo", firstName: "leonardo" },
  { id: "user_davidson", name: "Davidson", firstName: "davidson" },
  { id: "user_bruna", name: "Bruna", firstName: "bruna" },
  { id: "user_gabriel", name: "Gabriel", firstName: "gabriel" },
  { id: "user_guilherme", name: "Guilherme", firstName: "guilherme" },
]

export function FloatingChat() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [hasMentionNotification, setHasMentionNotification] = useState(false)
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState<typeof ADMIN_USERS>([])
  const [mentionQuery, setMentionQuery] = useState("")
  const [cursorPosition, setCursorPosition] = useState(0)
  const [isUserActive, setIsUserActive] = useState(true)
  const [lastActivityTime, setLastActivityTime] = useState(Date.now())

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const backgroundPollingRef = useRef<NodeJS.Timeout | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const activityCheckRef = useRef<NodeJS.Timeout | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetActivityTimer()
      } else {
        setIsUserActive(false)
      }
    }

    const handleFocus = () => {
      resetActivityTimer()
    }

    const handleBlur = () => {
      setIsUserActive(false)
    }

    const handleUserActivity = () => {
      resetActivityTimer()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)
    window.addEventListener("mousemove", handleUserActivity)
    window.addEventListener("keydown", handleUserActivity)
    window.addEventListener("click", handleUserActivity)
    window.addEventListener("scroll", handleUserActivity)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
      window.removeEventListener("mousemove", handleUserActivity)
      window.removeEventListener("keydown", handleUserActivity)
      window.removeEventListener("click", handleUserActivity)
      window.removeEventListener("scroll", handleUserActivity)
    }
  }, [])

  useEffect(() => {
    if (user) {
      activityCheckRef.current = setInterval(() => {
        checkUserActivity()
      }, 60000) // Verifica a cada 1 minuto
    }

    return () => {
      if (activityCheckRef.current) {
        clearInterval(activityCheckRef.current)
        activityCheckRef.current = null
      }
    }
  }, [user, lastActivityTime])

  const resetActivityTimer = () => {
    setLastActivityTime(Date.now())
    setIsUserActive(true)
  }

  const checkUserActivity = () => {
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityTime
    const threeMinutes = 3 * 60 * 1000 // 3 minutos em millisegundos

    if (timeSinceLastActivity >= threeMinutes || !user) {
      setIsUserActive(false)
    }
  }

  const detectMentionInput = (text: string, position: number) => {
    const beforeCursor = text.substring(0, position)
    const mentionMatch = beforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase()
      const filtered = ADMIN_USERS.filter((admin) => admin.firstName.includes(query) && admin.id !== user?.id)
      setMentionQuery(query)
      setMentionSuggestions(filtered)
      setShowMentionSuggestions(true)
    } else {
      setShowMentionSuggestions(false)
    }
  }

  const insertMention = (adminName: string) => {
    const beforeCursor = newMessage.substring(0, cursorPosition)
    const afterCursor = newMessage.substring(cursorPosition)
    const beforeMention = beforeCursor.replace(/@\w*$/, `@${adminName} `)
    const newText = beforeMention + afterCursor

    setNewMessage(newText)
    setShowMentionSuggestions(false)

    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = beforeMention.length
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newPosition, newPosition)
      }
    }, 0)
  }

  const detectMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1].toLowerCase())
    }
    return mentions
  }

  const isUserMentioned = (message: Message): boolean => {
    if (!user || !message.mentions) return false
    const userFirstName = user.name.split(" ")[0].toLowerCase()
    return message.mentions.includes(userFirstName)
  }

  const markMentionAsRead = async (messageId: string) => {
    try {
      await bridge("chat", "update_mensagem", {
        message_id: messageId,
        user_id: user?.id,
        atualizacao: "lido",
      })

      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, atualizacao: "lido", readByMentioned: true } : msg)),
      )

      const hasUnreadMentions = messages.some(
        (msg) => isUserMentioned(msg) && !msg.readByMentioned && msg.id !== messageId,
      )
      setHasMentionNotification(hasUnreadMentions)
    } catch (error) {
      console.error("[v0] Erro ao marcar menção como lida:", error)
    }
  }

  const scrollToBottom = (force = false) => {
    setTimeout(
      () => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
          }
        }
      },
      force ? 0 : 100,
    )
  }

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    if (isOpen) {
      inactivityTimerRef.current = setTimeout(() => {
        setIsOpen(false)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }, 30000) // 30 segundos
    }
  }

  useEffect(() => {
    if (isOpen) {
      resetInactivityTimer()
    } else {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (user && user.role === "admin" && isUserActive) {
      fetchMessages()

      if (isOpen && !pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => {
          fetchMessages(true)
        }, 3000)
      } else if (!isOpen && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [user, isOpen])

  useEffect(() => {
    if (user && user.role === "admin" && isUserActive) {
      backgroundPollingRef.current = setInterval(() => {
        if (isUserActive && user) {
          fetchMessages(true)
        }
      }, 120000) // 2 minutos = 120000ms
    } else if (backgroundPollingRef.current) {
      clearInterval(backgroundPollingRef.current)
      backgroundPollingRef.current = null
    }

    return () => {
      if (backgroundPollingRef.current) {
        clearInterval(backgroundPollingRef.current)
        backgroundPollingRef.current = null
      }
    }
  }, [user, isUserActive])

  const fetchMessages = async (silentLoad = false) => {
    try {
      if (!silentLoad) {
        setLoading(true)
      }
      console.log("[v0] Carregando mensagens do chat...")

      const response = await bridge("chat", "listar_mensagens", {
        user_id: user?.id,
        user_name: user?.name,
        data_solicitacao: new Date().toISOString().split("T")[0] + " " + new Date().toTimeString().split(" ")[0],
      })

      console.log("[v0] Mensagens recebidas:", response)

      if (response && response.ideias && Array.isArray(response.ideias)) {
        const processedMessages = response.ideias.map((msg: any) => {
          const mentions = detectMentions(msg.mensagem)
          return {
            id: msg.id.toString(),
            user_id: msg.user_id,
            user_name: msg.user_name,
            mensagem: msg.mensagem,
            data_mensagem: msg.data_mensagem,
            read: false,
            mentions,
            atualizacao: msg.atualizacao, // Usando atualizacao em vez de lido
            readByMentioned: msg.atualizacao === "lido",
          }
        })

        const hasNewMessages =
          processedMessages.length !== messages.length ||
          processedMessages.some((newMsg, index) => {
            const existingMsg = messages[index]
            return !existingMsg || existingMsg.id !== newMsg.id || existingMsg.atualizacao !== newMsg.atualizacao
          })

        if (hasNewMessages) {
          setMessages(processedMessages)

          const hasUnreadMentions = processedMessages.some((msg) => isUserMentioned(msg) && msg.atualizacao !== "lido")
          setHasMentionNotification(hasUnreadMentions)

          if (isOpen) {
            scrollToBottom(true)
          }
        }
      } else {
        setMessages([])
      }
    } catch (error) {
      console.error("[v0] Erro ao carregar mensagens:", error)
      setMessages([])
    } finally {
      if (!silentLoad) {
        setLoading(false)
      }
      setIsInitialLoad(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    resetInactivityTimer()
    resetActivityTimer()

    try {
      console.log("[v0] Enviando mensagem:", newMessage)

      const mentions = detectMentions(newMessage)

      const response = await bridge("chat", "enviar_mensagem", {
        user_id: user.id,
        user_name: user.name,
        mensagem: newMessage,
        mentions,
        data_mensagem: new Date().toISOString().split("T")[0] + " " + new Date().toTimeString().split(" ")[0],
      })

      console.log("[v0] Resposta do envio:", response)

      setNewMessage("")
      setShowMentionSuggestions(false)

      setTimeout(() => {
        fetchMessages()
        scrollToBottom(true)
      }, 500)
    } catch (error) {
      console.error("[v0] Erro ao enviar mensagem:", error)
    }
  }

  const handleOpenChat = () => {
    setIsOpen(true)
    fetchMessages()
    resetInactivityTimer()
    resetActivityTimer()
    setTimeout(() => scrollToBottom(true), 200)
  }

  const handleCloseChat = () => {
    setIsOpen(false)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const renderMessageWithMentions = (text: string) => {
    const mentionRegex = /@(\w+)/g
    const parts = text.split(mentionRegex)

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded font-medium">
            @{part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleOpenChat}
            className={`relative h-14 w-14 rounded-full shadow-lg ${
              hasMentionNotification ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[#4b8655] hover:bg-[#3d6b46]"
            }`}
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 md:w-96">
          <Card className="shadow-2xl border-0">
            <CardHeader className="bg-[#4b8655] text-white rounded-t-lg p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Chat Administrativo</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseChat}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseChat}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-80 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {loading && isInitialLoad ? (
                    <div className="text-center text-gray-500 py-8">Carregando mensagens...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Nenhuma mensagem ainda. Seja o primeiro a enviar!
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.user_id === user?.id ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-[#4b8655] text-white">
                            {getInitials(message.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 ${message.user_id === user?.id ? "text-right" : "text-left"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{message.user_name}</span>
                            <span className="text-xs text-gray-500">{formatTime(message.data_mensagem)}</span>
                            {message.atualizacao === "lido" && isUserMentioned(message) && (
                              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Visto
                              </span>
                            )}
                          </div>
                          <div
                            className={`inline-block p-3 rounded-lg max-w-xs relative ${
                              message.user_id === user?.id ? "bg-[#4b8655] text-white" : "bg-gray-100 text-gray-900"
                            } ${isUserMentioned(message) && message.atualizacao !== "lido" ? "ring-2 ring-red-400" : ""} ${
                              message.atualizacao === "lido" && isUserMentioned(message)
                                ? "opacity-70 border-l-4 border-green-400 bg-green-50"
                                : ""
                            }`}
                          >
                            <p className="text-sm">{renderMessageWithMentions(message.mensagem)}</p>
                            {isUserMentioned(message) && message.atualizacao !== "lido" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markMentionAsRead(message.id)}
                                className="absolute -bottom-2 -right-2 h-6 w-6 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="border-t p-4 relative">
                {showMentionSuggestions && mentionSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border rounded-lg shadow-lg max-h-32 overflow-y-auto z-10">
                    {mentionSuggestions.map((admin) => (
                      <button
                        key={admin.id}
                        onClick={() => insertMention(admin.firstName)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-[#4b8655] text-white">
                            {getInitials(admin.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>@{admin.firstName}</span>
                        <span className="text-gray-500">({admin.name})</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      setCursorPosition(e.target.selectionStart || 0)
                      detectMentionInput(e.target.value, e.target.selectionStart || 0)
                    }}
                    onSelect={(e) => {
                      const target = e.target as HTMLInputElement
                      setCursorPosition(target.selectionStart || 0)
                      detectMentionInput(newMessage, target.selectionStart || 0)
                    }}
                    placeholder="Digite sua mensagem... (use @nome para mencionar)"
                    className="flex-1"
                    onFocus={() => {
                      resetInactivityTimer()
                      resetActivityTimer()
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !showMentionSuggestions) {
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || loading}
                    className="bg-[#4b8655] hover:bg-[#3d6b46]"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
