"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileImage, FileVideo, File, X } from "lucide-react"
import { bridge } from "@/lib/bridge"
import { getUser } from "@/lib/auth-client"

interface UploadedFile {
  file: File
  preview?: string
}

export function ClientMaterialsUpload() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isContextModalOpen, setIsContextModalOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [materialName, setMaterialName] = useState("")
  const [materialContext, setMaterialContext] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const user = getUser()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const newFiles: UploadedFile[] = files.map((file) => {
      const uploadedFile: UploadedFile = { file }

      // Create preview for images
      if (file.type.startsWith("image/")) {
        uploadedFile.preview = URL.createObjectURL(file)
      }

      return uploadedFile
    })

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const handleUploadSubmit = () => {
    if (uploadedFiles.length === 0) return
    setIsUploadModalOpen(false)
    setIsContextModalOpen(true)
  }

  const handleFinalSubmit = async () => {
    if (!materialName.trim()) return

    setIsUploading(true)
    try {
      // Upload files first
      const uploadedUrls: string[] = []

      console.log("[v0] Iniciando upload de", uploadedFiles.length, "arquivos")

      for (const uploadedFile of uploadedFiles) {
        const formData = new FormData()
        formData.append("files", uploadedFile.file)

        const response = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const result = await response.json()
          if (result.files && result.files.length > 0) {
            const filePath = result.files[0].path
            const completeUrl = `${window.location.origin}/${filePath}`
            uploadedUrls.push(completeUrl)
            console.log("[v0] Arquivo enviado com sucesso:", completeUrl)
          } else {
            console.error("[v0] Resposta da API não contém arquivos:", result)
          }
        } else {
          console.error("[v0] Erro no upload do arquivo:", uploadedFile.file.name)
        }
      }

      console.log("[v0] URLs dos arquivos enviados:", uploadedUrls)

      const webhookData = {
        cliente_id: user?.cliente_id,
        user_id: user?.id,
        user_name: user?.name,
        nome_material: materialName.trim(),
        contexto: materialContext.trim(),
        arquivos: uploadedUrls,
        data_envio: new Date().toISOString().slice(0, 19).replace("T", " "),
      }

      console.log("[v0] Dados sendo enviados para o webhook:", webhookData)

      // Send to webhook
      await bridge("materiais", "materiais", webhookData)

      console.log("[v0] Webhook enviado com sucesso")

      // Reset state
      setUploadedFiles([])
      setMaterialName("")
      setMaterialContext("")
      setIsContextModalOpen(false)

      alert("Materiais enviados com sucesso!")
    } catch (error) {
      console.error("[v0] Erro ao enviar materiais:", error)
      alert("Erro ao enviar materiais. Tente novamente.")
    } finally {
      setIsUploading(false)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <FileImage className="w-8 h-8 text-blue-500" />
    if (file.type.startsWith("video/")) return <FileVideo className="w-8 h-8 text-purple-500" />
    return <File className="w-8 h-8 text-gray-500" />
  }

  return (
    <>
      <div
        onClick={() => setIsUploadModalOpen(true)}
        className="bg-gradient-to-br from-[#7de08d] to-[#4b8655] rounded-xl p-8 text-center cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">Enviar Materiais</h3>
          <p className="text-white/90 text-sm">Faça upload de fotos, vídeos e outros materiais para seus projetos</p>
        </div>
      </div>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Materiais</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Clique para selecionar arquivos ou arraste e solte aqui</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button onClick={() => document.getElementById("file-upload")?.click()} variant="outline">
                Selecionar Arquivos
              </Button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Arquivos Selecionados:</h4>
                <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                  {uploadedFiles.map((uploadedFile, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      {uploadedFile.preview ? (
                        <img
                          src={uploadedFile.preview || "/placeholder.svg"}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        getFileIcon(uploadedFile.file)
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{uploadedFile.file.name}</p>
                        <p className="text-xs text-gray-500">{(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeFile(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleUploadSubmit}
                disabled={uploadedFiles.length === 0}
                className="bg-[#4b8655] hover:bg-[#3d6b47]"
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isContextModalOpen} onOpenChange={setIsContextModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informações do Material</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome do Material *</label>
              <Input
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="Ex: Fotos do produto, Vídeo institucional..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contexto/Descrição</label>
              <Textarea
                value={materialContext}
                onChange={(e) => setMaterialContext(e.target.value)}
                placeholder="Descreva o contexto ou como estes materiais devem ser utilizados..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsContextModalOpen(false)}>
                Voltar
              </Button>
              <Button
                onClick={handleFinalSubmit}
                disabled={!materialName.trim() || isUploading}
                className="bg-[#4b8655] hover:bg-[#3d6b47]"
              >
                {isUploading ? "Enviando..." : "Enviar Materiais"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
