"use client"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type React from "react"

import { AppSidebar } from "./app-sidebar"
import { Topbar } from "./topbar"

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <div className="flex-1 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
