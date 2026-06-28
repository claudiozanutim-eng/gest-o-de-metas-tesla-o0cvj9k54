export const HEADER_MAP: Record<string, string> = {
  regional: 'regional',
  distrito: 'distrito',
  area: 'area',
  vendedor: 'vendedor',
  periodo: 'periodo',
  metrica: 'metrica',
  familia: 'familia',
  frota: 'frota',
  frotas: 'frota',
  'meta base': 'meta_base',
  'meta bronze': 'meta_bronze',
  'meta prata': 'meta_prata',
  'meta ouro': 'meta_ouro',
  'cobertura diaria': 'cobertura_diaria',
  'cobertura semanal': 'cobertura_semanal',
  'cobertura mensal': 'cobertura_mensal',
  cnpjs: 'cnpjs',
  'empresa foco': 'cnpjs',
  empresa: 'cnpjs',
  'frota foco': 'frota',
  cobertura: 'cobertura',
}

export const TEMPLATE_HEADERS = [
  'Distrito',
  'Regional',
  'Área',
  'Vendedor',
  'Período',
  'Família',
  'Frota',
  'Empresa',
  'Meta Base',
  'Meta Bronze',
  'Meta Prata',
  'Meta Ouro',
  'Cobertura',
]

export const REQUIRED_HEADERS = [
  'vendedor',
  'distrito',
  'regional',
  'area',
  'periodo',
  'meta_base',
  'meta_bronze',
  'meta_prata',
  'meta_ouro',
  'cobertura',
]

export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function detectSeparator(text: string): string {
  const firstLine = text.split('\n')[0] || ''
  return (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','
}

export function parseCSV(text: string): { headers: string[]; data: Record<string, string>[] } {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const lines: string[][] = []
  let curLine: string[] = []
  let curCell = ''
  let inQ = false
  const sep = detectSeparator(text)

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    if (char === '"' && inQ && nextChar === '"') {
      curCell += '"'
      i++
    } else if (char === '"') inQ = !inQ
    else if (char === sep && !inQ) {
      curLine.push(curCell)
      curCell = ''
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQ) {
      if (char === '\r') i++
      curLine.push(curCell)
      lines.push(curLine)
      curLine = []
      curCell = ''
    } else curCell += char
  }
  if (curCell || curLine.length > 0) {
    curLine.push(curCell)
    lines.push(curLine)
  }

  const validLines = lines.filter((l) => l.some((cell) => cell.trim().length > 0))
  if (validLines.length < 2) throw new Error('Arquivo vazio ou sem dados')

  const headers = validLines[0].map((h) => h.trim())
  const data = validLines.slice(1).map((line) => {
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = line[idx] !== undefined ? line[idx].trim() : ''
    })
    return row
  })
  return { headers, data }
}

export function mapRowsToStandard(
  headers: string[],
  data: Record<string, string>[],
): Record<string, string>[] {
  return data.map((row) => {
    const out: Record<string, string> = {}
    headers.forEach((h) => {
      const key = HEADER_MAP[normalizeHeader(h)] || normalizeHeader(h)
      out[key] = row[h] || ''
    })
    return out
  })
}

export function validateHeaders(headers: string[]): string[] {
  const mapped = headers.map((h) => HEADER_MAP[normalizeHeader(h)] || normalizeHeader(h))
  return REQUIRED_HEADERS.filter((r) => !mapped.includes(r))
}
