export const dynamic = "force-dynamic"

// Armazenamento em memória para preview (somente runtime do preview)
// Mantém os bytes enquanto a aba estiver aberta
type BlobRec = { type: string; data: Uint8Array; name?: string; createdAt: number }
declare global {
  // eslint-disable-next-line no-var
  var __uploadStore: Map<string, BlobRec> | undefined
}
const store: Map<string, BlobRec> = (globalThis as any).__uploadStore || new Map()
;(globalThis as any).__uploadStore = store

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const files = form.getAll("files")
    const saved: { id: string; path: string }[] = []

    for (const entry of files) {
      if (entry instanceof File) {
        const buf = new Uint8Array(await entry.arrayBuffer())
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`
        store.set(id, {
          type: entry.type || "application/octet-stream",
          data: buf,
          name: entry.name,
          createdAt: Date.now(),
        })
        // Path relativo que nossa UI entende e converte com toPublicUrl
        saved.push({ id, path: `api/uploads/${id}` })
      }
    }

    return Response.json({ ok: true, files: saved }, { status: 200 })
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Falha no upload" }, { status: 500 })
  }
}
