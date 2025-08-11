export const dynamic = "force-dynamic"

type BlobRec = { type: string; data: Uint8Array; name?: string; createdAt: number }
declare global {
  // eslint-disable-next-line no-var
  var __uploadStore: Map<string, BlobRec> | undefined
}
const store: Map<string, BlobRec> = (globalThis as any).__uploadStore || new Map()
;(globalThis as any).__uploadStore = store

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id
  const rec = store.get(id)
  if (!rec) return new Response("Not found", { status: 404 })
  return new Response(rec.data, {
    status: 200,
    headers: {
      "Content-Type": rec.type || "application/octet-stream",
      "Cache-Control": "public, max-age=60",
    },
  })
}
