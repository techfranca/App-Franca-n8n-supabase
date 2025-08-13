"use client"

import type React from "react"
import { Poppins, Montserrat } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

// Define as fontes a serem usadas na página
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] })
const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700"] })

// Componente principal da página de login
export default function LoginPage() {
  return (
    <div className={`${poppins.className} min-h-screen flex items-center justify-center bg-gray-50 p-4`}>
      <LoginForm />
    </div>
  )
}

// Componente do formulário de login
function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)

  // Função para lidar com o envio do formulário
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await signIn(email, password)
    setPending(false)
    if (res.ok) {
      // Mensagem de sucesso profissional
      toast({
        title: `Bem-vindo(a) de volta, ${res.user?.name || ''}!`,
        description: "Login realizado com sucesso. Redirecionando...",
      })
      router.push("/social/overview")
    } else {
      // Mensagem de erro clara
      toast({
        title: "Falha no login",
        description: res.error || "Credenciais inválidas. Por favor, tente novamente.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-gray-200">
      <CardHeader className="text-center">
        {/* Título com a identidade visual */}
        <div className={`flex items-center justify-center gap-3 text-2xl font-semibold text-[#081534] ${montserrat.className}`}>
          <div className="h-10 w-10 rounded-lg bg-[#7de08d] text-[#081534] flex items-center justify-center font-bold text-xl">
            F.
          </div>
          <span>Franca Insights</span>
        </div>
        
        {/* Mensagem de boas-vindas */}
        <CardTitle className="text-xl pt-4 font-semibold text-[#081534]">
          Acesse sua conta
        </CardTitle>
        <CardDescription className="text-gray-600">
          Bem-vindo! Insira seus dados para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail ou usuário</Label>
            <Input
              id="email"
              type="text"
              required
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10"
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full bg-[#7de08d] text-[#081534] font-bold hover:bg-[#6cbf7a] h-11">
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
