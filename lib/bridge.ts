export type BridgeOk<T = unknown> = { ok: true; data: T }
export type BridgeErr = { ok: false; error: string }

export async function bridge<TPayload = unknown, TData = unknown>(
  resource: string,
  action: string,
  payload?: TPayload,
): Promise<TData> {
  const res = await fetch("/api/bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, action, payload }),
  })

  let json: BridgeOk<TData> | BridgeErr
  try {
    json = (await res.json()) as BridgeOk<TData> | BridgeErr
  } catch {
    throw new Error("Resposta inválida da bridge.")
  }

  if (!json || (json as any).ok !== true) {
    const msg = (json as any)?.error || `Falha na bridge (${res.status})`
    throw new Error(msg)
  }

  return (json as BridgeOk<TData>).data
}
