onRecordAfterCreateSuccess((e) => {
  const source = e.record.getString('source')
  const status = e.record.getString('status')
  if (source !== 'goals' || status !== 'pending') return e.next()

  const fileName = e.record.getString('file')
  if (!fileName) return e.next()

  const baseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
  const token = $secrets.get('PB_SUPERUSER_TOKEN') || ''
  const fileUrl = baseUrl + '/api/files/import_history/' + e.record.id + '/' + fileName

  let csvText = ''
  try {
    const res = $http.send({
      url: fileUrl,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token },
      timeout: 30,
    })
    if (res.statusCode !== 200) {
      const rec = $app.findRecordById('import_history', e.record.id)
      rec.set('status', 'Falha')
      rec.set('stats', { error: 'Failed to download file' })
      $app.save(rec)
      return e.next()
    }
    csvText = new TextDecoder().decode(res.body)
  } catch (err) {
    const rec = $app.findRecordById('import_history', e.record.id)
    rec.set('status', 'Falha')
    rec.set('stats', { error: 'Download error: ' + err.message })
    $app.save(rec)
    return e.next()
  }

  if (csvText.charCodeAt(0) === 0xfeff) csvText = csvText.slice(1)

  const lines = []
  let curLine = [],
    curCell = '',
    inQ = false
  const sep = (csvText.split('\n')[0] || '').indexOf(';') > -1 ? ';' : ','
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i],
      nc = csvText[i + 1]
    if (c === '"' && inQ && nc === '"') {
      curCell += '"'
      i++
    } else if (c === '"') inQ = !inQ
    else if (c === sep && !inQ) {
      curLine.push(curCell)
      curCell = ''
    } else if ((c === '\n' || (c === '\r' && nc === '\n')) && !inQ) {
      if (c === '\r') i++
      curLine.push(curCell)
      lines.push(curLine)
      curLine = []
      curCell = ''
    } else curCell += c
  }
  if (curCell || curLine.length > 0) {
    curLine.push(curCell)
    lines.push(curLine)
  }

  const validLines = lines.filter((l) => l.some((cell) => cell.trim().length > 0))
  if (validLines.length < 2) {
    const rec = $app.findRecordById('import_history', e.record.id)
    rec.set('status', 'Falha')
    rec.set('stats', { error: 'Empty or invalid CSV' })
    $app.save(rec)
    return e.next()
  }

  const HEADER_MAP = {
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
  function normH(h) {
    return h
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  const headers = validLines[0].map((h) => h.trim())
  const rows = validLines.slice(1).map((line) => {
    const row = {}
    headers.forEach((h, idx) => {
      const key = HEADER_MAP[normH(h)] || normH(h)
      row[key] = line[idx] !== undefined ? line[idx].trim() : ''
    })
    return row
  })

  try {
    const apiRes = $http.send({
      url: baseUrl + '/backend/v1/import-goals',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        rows: rows,
        fileName: fileName,
        source: 'File Upload',
        skipHistory: true,
        userId: e.record.getString('user_id'),
      }),
      timeout: 120,
    })

    const rec = $app.findRecordById('import_history', e.record.id)
    const result = apiRes.json || {}

    if (apiRes.statusCode === 200 && result.success) {
      rec.set('status', 'Sucesso')
      rec.set('stats', {
        created: result.created || 0,
        faturamentoCount: result.faturamentoCount || 0,
        coberturaCount: result.coberturaCount || 0,
        totalRows: result.totalRows || 0,
        countVerified: result.countVerified || false,
      })
    } else {
      rec.set('status', 'Falha')
      rec.set('stats', {
        error: 'Processing failed',
        errors: (result.errors || []).slice(0, 100),
      })
    }
    $app.save(rec)
  } catch (err) {
    const rec = $app.findRecordById('import_history', e.record.id)
    rec.set('status', 'Falha')
    rec.set('stats', { error: 'API error: ' + err.message })
    $app.save(rec)
  }

  return e.next()
}, 'import_history')
