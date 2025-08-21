"use client"

import type React from "react"

import { Poppins, Montserrat } from "next/font/google"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isAuthenticated } from "@/lib/auth-client"
import { AppStateProvider } from "@/stores/app-state"
import { FloatingChat } from "@/components/floating-chat"

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] })
const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700"] })

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
    }
  }, [router, pathname])

  return (
    <div className={`${poppins.className} bg-white text-[#081534] min-h-[100dvh]`}>
      <AppStateProvider>
        {children}
        <FloatingChat />
      </AppStateProvider>
    </div>
  )
}
