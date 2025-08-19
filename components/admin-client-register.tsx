"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Users } from "lucide-react"
import { bridge } from "@/lib/bridge"
import { getUser } from "@/lib/auth-client"
import { format } from "date-fns"

export function AdminClientRegister() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    client_id: "",
    nome_cliente: "",
    id_pasta_materiais: "",
    ano_pasta: new Date().getFullYear().toString(),
  })

  const user = getUser()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async () => {
    // Validação dos campos obrigatórios
    if (
      !formData.client_id.trim() ||
      !formData.nome_cliente.trim() ||
      !formData.id_pasta_materiais.trim() ||
      !formData.ano_pasta.trim()
    ) {
      alert("Todos os campos são obrigatórios!")
      return
    }

    setIsLoading(true)

    try {
      console.log("[v0] Cadastrando cliente:", formData)

      const payload = {
        client_id: formData.client_id.trim(),
        nome_cliente: formData.nome_cliente.trim(),
        id_pasta_materiais: formData.id_pasta_materiais.trim(),
        ano_pasta: formData.ano_pasta.trim(),
        admin_id: user?.id,
        admin_name: user?.name,
        data_cadastro: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      }

      console.log("[v0] Enviando dados para webhook:", payload)

      await bridge("materiais", "criando_cliente", payload)

      console.log("[v0] Cliente cadastrado com sucesso!")

      // Reset form e fecha modal
      setFormData({
        client_id: "",
        nome_cliente: "",
        id_pasta_materiais: "",
        ano_pasta: new Date().getFullYear().toString(),
      })
      setIsOpen(false)

      alert("Cliente cadastrado com sucesso!")
    } catch (error) {
      console.error("[v0] Erro ao cadastrar cliente:", error)
      alert("Erro ao cadastrar cliente. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg p-8 cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-105">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Cadastrar Cliente</h3>
              <p className="text-blue-100 text-sm">Adicione novos clientes ao sistema</p>
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Cadastrar Novo Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID *</Label>
            <Input
              id="client_id"
              placeholder="Ex: cli_empresa_2024"
              value={formData.client_id}
              onChange={(e) => handleInputChange("client_id", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_cliente">Nome do Cliente *</Label>
            <Input
              id="nome_cliente"
              placeholder="Ex: Empresa XYZ Ltda"
              value={formData.nome_cliente}
              onChange={(e) => handleInputChange("nome_cliente", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="id_pasta_materiais">ID da Pasta de Materiais *</Label>
            <Input
              id="id_pasta_materiais"
              placeholder="Ex: pasta_materiais_xyz_2024"
              value={formData.id_pasta_materiais}
              onChange={(e) => handleInputChange("id_pasta_materiais", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ano_pasta">Ano da Pasta *</Label>
            <Input
              id="ano_pasta"
              placeholder="Ex: 2024"
              value={formData.ano_pasta}
              onChange={(e) => handleInputChange("ano_pasta", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1" disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? "Cadastrando..." : "Cadastrar Cliente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
