import { PageShell } from "@/components/page-shell"
import { Montserrat } from "next/font/google"

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700"] })

export default function HomePage() {
  return (
    <PageShell title="Bem-vindo">
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 bg-white">
        {/* Logo grande e centralizada */}
        <div className="flex justify-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Group%201-KyYpDMvIcJBsu0FL3SKt1jSKC6YOeC.png"
            alt="FRANCA Assessoria Logo"
            className="w-36 h-36 object-contain"
          />
        </div>

        {/* Título com cores específicas */}
        <h1 className={`${montserrat.className} text-4xl font-bold text-center`}>
          <span className="text-[#081534]">BEM VINDO À PLATAFORMA </span>
          <span className="text-[#7de08d]">FRANCA</span>
        </h1>
      </div>
    </PageShell>
  )
}
