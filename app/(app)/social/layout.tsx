"use client"

import type React from "react"
import { Poppins, Montserrat } from "next/font/google"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isAuthenticated, getUser } from "@/lib/auth-client"
import { AppStateProvider, useAppState, useClientes } from "@/stores/app-state"

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] })
const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700"] })

function StateSync() {
  const { setUser, setCliente } = useAppState()
  const clientes = useClientes()
  const router = useRouter()

  useEffect(() => {
    async function syncUserAndCliente() {
      const isAuth = await isAuthenticated()
      if (!isAuth) {
        router.replace("/login")
        return
      }

      const user = await getUser()
      setUser(user) // Seta o usuário no estado global

      if (user?.cliente_id) {
        const clienteAtual = clientes.find(c => c.id === user.cliente_id)
        setCliente(clienteAtual ?? null) // Seta o cliente correspondente no estado global
      } else {
        setCliente(null) // Limpa o cliente se for admin ou não tiver um
      }
    }
    syncUserAndCliente()
  }, [setUser, setCliente, clientes, router])

  return null
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${poppins.className} bg-white text-[#081534] min-h-[100dvh]`}>
      <AppStateProvider>
        <StateSync />
        {children}
      </AppStateProvider>
    </div>
  )
}
