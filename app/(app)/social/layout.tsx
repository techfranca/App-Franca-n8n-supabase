"use client"

import type React from "react"
import { Poppins } from "next/font/google"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, getUser } from "@/lib/auth-client"
import { AppStateProvider, useAppState, useClientes } from "@/stores/app-state"
import { Card } from "@/components/ui/card" // Para a tela de loading

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] })

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { setUser, setCliente } = useAppState()
  const clientes = useClientes()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function syncSession() {
      const isAuth = await isAuthenticated()
      if (!isAuth) {
        router.replace("/login")
        return
      }

      const user = await getUser()
      if (!user) {
        // Se não encontrar o perfil, força o logout e redireciona
        router.replace("/login")
        return
      }
      
      setUser(user)

      if (user.role === 'cliente' && user.cliente_id) {
        const clienteAtual = clientes.find(c => c.id === user.cliente_id)
        setCliente(clienteAtual ?? null)
      } else {
        // Para admin/colaborador, o cliente inicial é nulo (eles escolhem no seletor)
        setCliente(null)
      }
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
