"use client"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar" // [^4]
import type React from "react"

import { AppSidebar } from "./app-sidebar"
import { Topbar } from "./topbar"

export function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <Topbar title={title} />
        <div className="flex-1 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
