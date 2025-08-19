export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string
    password?: string
  }

  const login = String(email ?? "").trim()
  const pass = String(password ?? "")

  type UserRow = {
    logins: string[]
    password: string
    user: {
      id: string
      name: string
      email: string
      role: "admin" | "colaborador" | "cliente" | "social_media" // Adicionando social_media ao tipo
      cliente_id?: string | null
    }
  }

  const USERS: UserRow[] = [
    {
      // Admin (desenvolvimento)
      logins: ["gabriel@franca.local", "Gabriel"],
      password: "Gabriel@102030",
      user: {
        id: "user_gabriel",
        name: "Gabriel",
        email: "gabriel@franca.local",
        role: "admin",
        cliente_id: null,
      },
    },
    {
      // Cliente 3haus
      logins: ["3haus", "3haus@3haus.local"],
      password: "3haus@102030",
      user: {
        id: "user_3haus",
        name: "3haus",
        email: "3haus@3haus.local",
        role: "cliente",
        // IMPORTANTE: mantenha este ID igual ao ID do cliente 3haus usado no app
        cliente_id: "cli_3haus",
      },
    },
  ]

  const match = USERS.find((u) => u.logins.includes(login))
  if (match && pass === match.password) {
    return Response.json({
      ok: true,
      data: {
        user: match.user,
        token: `mock_token_${match.user.id}`,
      },
    })
  }

  return Response.json({ ok: false, data: null, error: "Credenciais inválidas" }, { status: 401 })
}
