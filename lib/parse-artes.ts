export interface ArteSecao {
  indice: number
  titulo: string
  conteudo: string
}

export interface ParseArtesResult {
  total: number
  secoes: ArteSecao[]
}

export function parseArtes(texto: string): ParseArtesResult {
  if (!texto?.trim()) {
    return { total: 0, secoes: [] }
  }

  // Regex para detectar "Arte X:" no início da linha (case insensitive)
  const arteRegex = /^Arte\s*(\d+):\s*$/gim
  const linhas = texto.split("\n")
  const secoes: ArteSecao[] = []

  let currentSecao: ArteSecao | null = null
  let arteIndex = 0

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim()
    const match = linha.match(/^Arte\s*(\d+):\s*$/i)

    if (match) {
      // Se já temos uma seção em andamento, salva ela
      if (currentSecao) {
        currentSecao.conteudo = currentSecao.conteudo.trim()
        secoes.push(currentSecao)
      }

      // Inicia nova seção
      arteIndex++
      currentSecao = {
        indice: arteIndex,
        titulo: `Arte ${match[1]}`,
        conteudo: "",
      }
    } else if (currentSecao) {
      // Adiciona linha ao conteúdo da seção atual
      if (currentSecao.conteudo) {
        currentSecao.conteudo += "\n"
      }
      currentSecao.conteudo += linha
    } else if (linha) {
      // Texto antes da primeira "Arte X:" - cria seção única
      if (secoes.length === 0) {
        secoes.push({
          indice: 1,
          titulo: "Conteúdo",
          conteudo: texto.trim(),
        })
        break
      }
    }
  }

  // Adiciona a última seção se existir
  if (currentSecao) {
    currentSecao.conteudo = currentSecao.conteudo.trim()
    secoes.push(currentSecao)
  }

  // Se não encontrou nenhuma "Arte X:", trata como seção única
  if (secoes.length === 0 && texto.trim()) {
    secoes.push({
      indice: 1,
      titulo: "Conteúdo",
      conteudo: texto.trim(),
    })
  }

  return {
    total: secoes.length,
    secoes,
  }
}

export function truncateText(texto: string, maxChars = 200): string {
  if (!texto || texto.length <= maxChars) return texto

  // Encontra o último espaço antes do limite para não quebrar palavras
  const truncated = texto.substring(0, maxChars)
  const lastSpace = truncated.lastIndexOf(" ")

  if (lastSpace > maxChars * 0.8) {
    return truncated.substring(0, lastSpace) + "…"
  }

  return truncated + "…"
}
