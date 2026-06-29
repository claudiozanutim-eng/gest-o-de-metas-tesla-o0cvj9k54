import type { DashboardTableRow, DashboardSummary, ReportFilters } from '@/services/reports'

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function pctColor(pct: number): string {
  if (pct >= 100) return '#008000'
  if (pct >= 80) return '#FFA500'
  return '#FF0000'
}

export function exportReportExcel(
  rows: DashboardTableRow[],
  summary: DashboardSummary,
  filters: ReportFilters,
  isCoverage: boolean,
): void {
  const numFmt = isCoverage ? '#,##0' : '#,##0.00'
  const periodLabel = filters.period.replace('-', '_')
  const dateStr = new Date().toISOString().split('T')[0]

  const pctStyleMap = new Map<string, string>()
  for (const r of rows) {
    const c = pctColor(r.achievement_pct)
    if (!pctStyleMap.has(c)) pctStyleMap.set(c, `ps_${c.replace('#', '')}`)
  }
  const pctStylesXml = Array.from(pctStyleMap.entries())
    .map(
      ([color, id]) =>
        `<Style ss:ID="${id}"><Font ss:Color="${color}" ss:Bold="1"/><NumberFormat ss:Format="0.0%"/></Style>`,
    )
    .join('')

  const stylesXml = [
    '<Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/><Interior ss:Color="#003DA5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>',
    '<Style ss:ID="d1"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/></Borders></Style>',
    '<Style ss:ID="d2"><Interior ss:Color="#F7F9FC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/></Borders></Style>',
    `<Style ss:ID="n1"><NumberFormat ss:Format="${numFmt}"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/></Borders></Style>`,
    `<Style ss:ID="n2"><NumberFormat ss:Format="${numFmt}"/><Interior ss:Color="#F7F9FC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/></Borders></Style>`,
    '<Style ss:ID="sl"><Font ss:Bold="1" ss:Size="12" ss:Color="#003DA5"/></Style>',
    `<Style ss:ID="sv"><Font ss:Bold="1" ss:Size="14"/><NumberFormat ss:Format="${numFmt}"/></Style>`,
  ].join('')

  const hdrs = [
    'Vendedor',
    'Código',
    'Regional',
    'Área',
    'Família',
    'Meta Base',
    'Realizado',
    'Diferença',
    '% Atingimento',
  ]
  const colWidths =
    '<Column ss:Width="150"/><Column ss:Width="80"/><Column ss:Width="120"/><Column ss:Width="120"/><Column ss:Width="80"/><Column ss:Width="120"/><Column ss:Width="120"/><Column ss:Width="120"/><Column ss:Width="120"/>'
  let s1 = colWidths
  s1 += `<Row ss:Height="28">${hdrs.map((h) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')}</Row>`
  rows.forEach((r, i) => {
    const base = i % 2 === 0 ? 'd1' : 'd2'
    const num = i % 2 === 0 ? 'n1' : 'n2'
    const psid = pctStyleMap.get(pctColor(r.achievement_pct)) || 'd1'
    s1 +=
      '<Row>' +
      `<Cell ss:StyleID="${base}"><Data ss:Type="String">${esc(r.seller_name)}</Data></Cell>` +
      `<Cell ss:StyleID="${base}"><Data ss:Type="String">${esc(r.seller_code)}</Data></Cell>` +
      `<Cell ss:StyleID="${base}"><Data ss:Type="String">${esc(r.regional_name)}</Data></Cell>` +
      `<Cell ss:StyleID="${base}"><Data ss:Type="String">${esc(r.area_name)}</Data></Cell>` +
      `<Cell ss:StyleID="${base}"><Data ss:Type="String">${esc(r.family)}</Data></Cell>` +
      `<Cell ss:StyleID="${num}"><Data ss:Type="Number">${r.target_base}</Data></Cell>` +
      `<Cell ss:StyleID="${num}"><Data ss:Type="Number">${r.actual_value}</Data></Cell>` +
      `<Cell ss:StyleID="${num}"><Data ss:Type="Number">${r.difference}</Data></Cell>` +
      `<Cell ss:StyleID="${psid}"><Data ss:Type="Number">${(r.achievement_pct / 100).toFixed(4)}</Data></Cell>` +
      '</Row>'
  })

  const sumColor = pctColor(summary.achievement_pct)
  const sumPctStyle = `<Style ss:ID="sps"><Font ss:Color="${sumColor}" ss:Bold="1" ss:Size="14"/><NumberFormat ss:Format="0.0%"/></Style>`
  let s2 =
    '<Row><Cell ss:StyleID="sl"><Data ss:Type="String">Resumo Executivo</Data></Cell></Row><Row/>'
  s2 += `<Row><Cell ss:StyleID="sl"><Data ss:Type="String">Total Realizado</Data></Cell><Cell ss:StyleID="sv"><Data ss:Type="Number">${summary.total_actual}</Data></Cell></Row>`
  s2 += `<Row><Cell ss:StyleID="sl"><Data ss:Type="String">Meta Base Total</Data></Cell><Cell ss:StyleID="sv"><Data ss:Type="Number">${summary.total_target}</Data></Cell></Row>`
  s2 += `<Row><Cell ss:StyleID="sl"><Data ss:Type="String">% Atingimento</Data></Cell><Cell ss:StyleID="sps"><Data ss:Type="Number">${(summary.achievement_pct / 100).toFixed(4)}</Data></Cell></Row>`

  const xml =
    '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    `<Styles>${stylesXml}${pctStylesXml}${sumPctStyle}</Styles>` +
    `<Worksheet ss:Name="Dados Detalhados"><Table>${s1}</Table></Worksheet>` +
    `<Worksheet ss:Name="Resumo"><Table>${s2}</Table></Worksheet>` +
    '</Workbook>'

  const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `Relatorio_Metas_${periodLabel}_${dateStr}.xls`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
