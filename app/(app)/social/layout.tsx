"use client"

import type React from "react"
import { Poppins } from "next/font/google"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getUser } from "@/lib/auth-client" // Usaremos a versão "tudo no código"
import { AppStateProvider, useAppState, useClientes } from "@/stores/app-state"
import { Card } from "@/components/ui/card"

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] })

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { setUser, setCliente, clientes } = useAppState()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function syncSession() {
      // A função getUser da nossa auth-client "tudo no código" é síncrona
      const user = getUser()
      
      if (!user) {
        router.replace("/login")
        return
      }
      
      // Seta o usuário no estado global
      setUser(user)

      // Se o usuário logado for um cliente, encontra e seta o cliente no estado global
      if (user.role === 'cliente' && user.cliente_id) {
          const clienteAtual = clientes.find(c => c.id === user.cliente_id)
          setCliente(clienteAtual ?? null)
      } else {
        // Se for admin, o cliente inicial é nulo (ele escolhe no seletor)
        setCliente(null)
      }
      // Libera a exibição da página
      setIsLoading(false)
    }
    
    syncSession()
  }, [setUser, setCliente, clientes, router])

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="p-6 text-sm text-muted-foreground">Verificando sessão...</Card>
        </div>
    )
  }

  return <>{children}</>
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${poppins.className} bg-white text-[#081534] min-h-[100dvh]`}>
      <AppStateProvider>
        <AuthGuard>
          {children}
        </AuthGuard>
      </AppStateProvider>
    </div>
  )
}
