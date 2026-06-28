// @deps xlsx@0.18.5
routerAdd(
  'POST',
  '/backend/v1/parse-excel',
  (e) => {
    const XLSX = require('xlsx')
    const body = e.requestInfo().body || {}
    const b64 = body.data
    if (!b64) return e.badRequestError('No data provided')

    const lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const clean = b64.replace(/[^A-Za-z0-9+/]/g, '')
    const bytes = []
    for (let i = 0; i < clean.length; i += 4) {
      const e1 = lookup.indexOf(clean[i])
      const e2 = lookup.indexOf(clean[i + 1])
      const e3 = lookup.indexOf(clean[i + 2])
      const e4 = lookup.indexOf(clean[i + 3])
      bytes.push((e1 << 2) | (e2 >> 4))
      if (e3 !== 64) bytes.push(((e2 & 15) << 4) | (e3 >> 2))
      if (e4 !== 64) bytes.push(((e3 & 3) << 6) | e4)
    }

    const wb = XLSX.read(new Uint8Array(bytes), { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })

    if (!json || json.length < 2) return e.badRequestError('Empty or invalid Excel file')

    const headers = json[0].map(function (h) {
      return String(h || '').trim()
    })
    const dataRows = json.slice(1).map(function (row) {
      const obj = {}
      headers.forEach(function (h, i) {
        obj[h] = String(row[i] || '').trim()
      })
      return obj
    })

    return e.json(200, { headers: headers, data: dataRows })
  },
  $apis.requireAuth(),
)
