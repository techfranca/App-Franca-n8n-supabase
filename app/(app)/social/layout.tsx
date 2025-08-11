"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isAuthenticated } from "@/lib/auth-client"
import { AppStateProvider } from "@/stores/app-state"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
    }
  }, [router, pathname])

  return (
    <div className="bg-white text-[#081534] min-h-[100dvh]">
      <AppStateProvider>{children}</AppStateProvider>
    </div>
  )
}
