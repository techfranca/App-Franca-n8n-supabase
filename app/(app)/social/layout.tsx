"use client"

import type React from "react"
import { Poppins, Montserrat } from "next/font/google"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isAuthenticated, getUser } from "@/lib/auth-client" // Importar getUser
import { AppStateProvider, useAppState, useClientes } from "@/stores/app-state" // Importar hooks

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] })
const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700"] })

// Componente para sincronizar o estado
function StateSync() {
  const { setCliente } = useAppState()
  const clientes = useClientes()

  useEffect(() => {
    async function syncUser() {
      const user = await getUser() // Pega o usuário logado do Supabase
      if (user?.cliente_id) {
        const clienteAtual = clientes.find(c => c.id === user.cliente_id)
        if (clienteAtual) {
          setCliente(clienteAtual) // Atualiza o estado global com o cliente correto
        }
      } else {
        setCliente(null) // Limpa o cliente se o usuário não tiver um (ex: admin)
      }
    }
    syncUser()
  }, [setCliente, clientes])

  return null // Este componente não renderiza nada
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // A função isAuthenticated agora é assíncrona
    isAuthenticated().then(isAuth => {
      if (!isAuth) {
        router.replace("/login")
      }
    })
  }, [router, pathname])

  return (
    <div className={`${poppins.className} bg-white text-[#081534] min-h-[100dvh]`}>
      <AppStateProvider>
        <StateSync /> {/* Adicionamos o componente de sincronização aqui */}
        {children}
      </AppStateProvider>
    </div>
  )
}
