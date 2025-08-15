"use client"

import { MessagesSquare, Lightbulb, Send, ChevronDown, LogOut, BarChart3 } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getUser, setRole, signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { AuthUser } from "@/lib/types"
import Link from "next/link"
import { FeedbackDialog } from "@/components/feedback-dialog"

export function AppSidebar() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(getUser())

  useEffect(() => {
    setUser(getUser())
  }, [])

  const canChangeRole = user?.role === "admin" || user?.role === "colaborador"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-center px-4 py-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%201777-gTL5rthUt3f5OiFstM3q0WWvz3F5B8.png"
            alt="França Assessoria Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
        <div className="px-2 py-2 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!canChangeRole}>
              <div
                className={`flex items-center gap-2 p-2 rounded-md ${canChangeRole ? "cursor-pointer hover:bg-sidebar-accent" : "cursor-default"}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.name?.slice(0, 2).toUpperCase() || "US"}</AvatarFallback>
                </Avatar>
                <div className="text-sm flex-1 min-w-0">
                  <div className="font-medium text-[#081534] truncate">{user?.name || "Usuário"}</div>
                  <div className="text-muted-foreground capitalize text-xs">{user?.role || "desconhecido"}</div>
                </div>
              </div>
            </DropdownMenuTrigger>
            {canChangeRole && (
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    setRole("cliente")
                    setUser(getUser())
                  }}
                >
                  Tornar Cliente
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRole("colaborador")
                    setUser(getUser())
                  }}
                >
                  Tornar Colaborador
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRole("admin")
                    setUser(getUser())
                  }}
                >
                  Tornar Admin
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="group-data-[state=open]/collapsible:bg-sidebar-accent group-data-[state=open]/collapsible:text-sidebar-accent-foreground">
                      <MessagesSquare className="text-[#4b8655]" />
                      <span>Social Media</span>
                      <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href="/social/overview">
                            <BarChart3 className="text-[#4b8655]" />
                            <span>Visão Geral</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href="/social/ideias">
                            <Lightbulb className="text-[#4b8655]" />
                            <span>Ideias</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href="/social/publicacoes">
                            <Send className="text-[#4b8655]" />
                            <span>Publicações</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <FeedbackDialog />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                signOut()
                router.push("/login")
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
