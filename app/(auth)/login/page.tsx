"use client"

import type React from "react"
import { Poppins, Montserrat } from "next/font/google"
import { Button } from "@/components/ui/button"
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
    <div className={`${poppins.className} min-h-screen flex bg-gray-50`}>
      {/* Coluna esquerda - Formulário de login */}
      <div className="w-1/2 flex items-center justify-center p-8">
        <LoginForm />
      </div>

      {/* Coluna direita - Conteúdo informativo */}
      <div className="w-1/2 flex items-center justify-center p-8 bg-white">
        <WelcomeContent />
      </div>
    </div>
  )
}

function WelcomeContent() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className={`${montserrat.className} text-3xl font-bold text-gray-900 mb-4`}>
          Bem-vindo à nossa nova plataforma interna!
        </h1>
        <p className="text-gray-600 leading-relaxed">
          Estamos felizes em te apresentar o novo sistema da FRANCA Assessoria — criado para facilitar nossa
          comunicação, organizar as entregas e acompanhar tudo de forma clara e centralizada.
        </p>
      </div>

      <div>
        <h2 className={`${montserrat.className} text-xl font-semibold text-gray-900 mb-3`}>Aqui você poderá:</h2>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Visualizar as ideias de conteúdo e aprovar com um clique</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Acompanhar as postagens e seus status (pendente, aprovado, postado)</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <span>Ter mais transparência e agilidade no dia a dia com nosso time</span>
          </li>
        </ul>
      </div>

      <p className="text-gray-600">
        Estamos sempre evoluindo, e essa plataforma é mais um passo para melhorar sua experiência com a FRANCA.
      </p>

      <div className="pt-4">
        <a href="#" className="text-green-500 hover:text-green-600 font-medium">
          💬 Qualquer dúvida, estamos por aqui
        </a>
      </div>
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
        title: `Bem-vindo(a) de volta, ${res.user?.name || ""}!`,
        description: "Login realizado com sucesso. Redirecionando...",
      })
      router.push("/") // Alterando redirecionamento para página principal em vez de /social/overview
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
    <div className="w-full max-w-sm space-y-6">
      {/* Logo e branding */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%201-KyYpDMvIcJBsu0FL3SKt1jSKC6YOeC.png"
            alt="FRANCA Assessoria Logo"
            className="w-24 h-24 object-contain"
          />
        </div>
        <div>
          <h2 className={`${montserrat.className} text-xl font-semibold text-gray-900`}>Entre na plataforma</h2>
          <p className="text-gray-600 text-sm">Acesse seu painel personalizado</p>
        </div>
      </div>

      {/* Formulário */}
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700 font-medium">
            Usuário
          </Label>
          <Input
            id="email"
            type="text"
            required
            placeholder="Seu nome de usuário"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-700 font-medium">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            required
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg"
        >
          {pending ? "Entrando..." : "Acessar Painel"}
        </Button>
      </form>

      {/* Texto exclusividade */}
      <p className="text-center text-xs text-gray-500">
        Essa plataforma é exclusiva para clientes da <strong>FRANCA Assessoria</strong>
      </p>

      {/* Footer */}
      <div className="pt-8">
        <p className="text-center text-xs text-gray-400">© 2024 FRANCA Assessoria - Todos os direitos reservados</p>
      </div>
    </div>
  )
}
