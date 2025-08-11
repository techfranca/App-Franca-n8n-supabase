"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { bridge } from "@/lib/bridge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Papa from "papaparse"
import { downloadCSV } from "@/lib/csv"

export function ImportCsvDialog() {
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [rows, setRows] = React.useState<any[]>([])
  const [headers, setHeaders] = React.useState<string[]>([])

  function onFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data as any[])
        setHeaders(res.meta.fields ?? [])
      },
      error: () => toast({ title: "Falha ao ler CSV", variant: "destructive" }),
    })
  }

  async function importar() {
    // stub: envia um fileId mock
    const res = await bridge("ideias", "import_csv", { fileId: "csv_mock_1" })
    if ((res as any).ok) {
      toast({ title: "Importação iniciada" })
      setOpen(false)
    } else {
      toast({ title: "Falha na importação", variant: "destructive" })
    }
  }

  function baixarModelo() {
    const model = [{ titulo: "Post Reels", plataforma: "Instagram", formato: "Reels", ideia: "Trilha de bastidores" }]
    downloadCSV("modelo_ideias.csv", Papa.unparse(model))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Importar CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFile(f)
            }}
          />
          <Button variant="link" onClick={baixarModelo}>
            Baixar modelo CSV
          </Button>
        </div>
        <div className="rounded-md border mt-2 max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={idx}>
                  {headers.map((h) => (
                    <TableCell key={h + idx}>{r[h]}</TableCell>
                  ))}
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={headers.length || 1} className="text-center text-muted-foreground">
                    Faça upload para visualizar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end">
          <Button className="bg-[#7de08d] text-[#081534] hover:bg-[#4b8655]" onClick={importar} disabled={!rows.length}>
            Importar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
