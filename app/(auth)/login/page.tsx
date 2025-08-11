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

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] })
const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700"] })

export default function LoginPage() {
  return (
    <div className={`${poppins.className} min-h-[100dvh] flex items-center justify-center bg-white`}>
      <LoginForm />
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    const res = await signIn(email, password)
    setPending(false)
    if (res.ok) {
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." })
      router.push("/social/overview")
    } else {
      toast({ title: "Erro no login", description: res.error ?? "Tente novamente", variant: "destructive" })
    }
  }

  return (
    <Card className="w-full max-w-sm border-[#4b8655]/30">
      <CardHeader>
        <div className={`${montserrat.className} text-2xl text-[#081534] font-semibold flex items-center gap-2`}>
          <div className="h-9 w-9 rounded-md bg-[#7de08d] text-[#081534] flex items-center justify-center font-bold">
            F.
          </div>
          Franca Insights
        </div>
        <CardTitle className="sr-only">Entrar</CardTitle>
        <CardDescription>Use seu e-mail ou usuário e senha para entrar.</CardDescription>
        <div className="mt-2 text-xs rounded-md bg-muted p-2">
          <div className="font-medium text-[#081534]">Acesso de teste (cliente):</div>
          <div>Login: 3haus</div>
          <div>Senha: 3haus@102030</div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail ou usuário</Label>
            <Input
              id="email"
              type="text"
              required
              placeholder="ex.: 3haus ou voce@franca.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            />
          </div>
          <Button type="submit" disabled={pending} className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]">
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
