// @deps xlsx@0.18.5
routerAdd(
  'POST',
  '/backend/v1/parse-excel',
  (e) => {
    const body = e.requestInfo().body || {}
    const b64 = body.data
    if (!b64) return e.badRequestError('No data provided')

    let XLSX
    try {
      XLSX = require('xlsx')
    } catch (err) {
      return e.json(500, { error: 'Biblioteca de Excel não disponível. Use formato CSV.' })
    }

    function base64ToBytes(str) {
      var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      str = str.replace(/[^A-Za-z0-9+/]/g, '')
      var bytes = []
      for (var i = 0; i < str.length; i += 4) {
        var a = lookup.indexOf(str[i])
        var b = lookup.indexOf(str[i + 1])
        var c = str[i + 2] ? lookup.indexOf(str[i + 2]) : -1
        var d = str[i + 3] ? lookup.indexOf(str[i + 3]) : -1
        var n = (a << 18) | (b << 12) | (c >= 0 ? c << 6 : 0) | (d >= 0 ? d : 0)
        bytes.push((n >> 16) & 0xff)
        if (c >= 0) bytes.push((n >> 8) & 0xff)
        if (d >= 0) bytes.push(n & 0xff)
      }
      return new Uint8Array(bytes)
    }

    var bytes
    try {
      bytes = base64ToBytes(b64)
    } catch (err) {
      return e.badRequestError('Failed to decode file data')
    }

    var workbook
    try {
      workbook = XLSX.read(bytes, { type: 'array' })
    } catch (err) {
      return e.badRequestError('Failed to parse Excel file: ' + err.message)
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return e.badRequestError('Empty or invalid Excel file')
    }

    var sheetName = workbook.SheetNames[0]
    var sheet = workbook.Sheets[sheetName]
    var json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (!json || json.length < 2) {
      return e.badRequestError('Empty or invalid Excel file')
    }

    var headers = json[0].map(function (h) {
      return String(h).trim()
    })
    var dataRows = json.slice(1).map(function (row) {
      var rowObj = {}
      headers.forEach(function (h, idx) {
        rowObj[h] = row[idx] !== undefined ? String(row[idx]).trim() : ''
      })
      return rowObj
    })

    var validRows = dataRows.filter(function (r) {
      return Object.values(r).some(function (v) {
        return v && v.trim().length > 0
      })
    })

    if (validRows.length === 0) {
      return e.badRequestError('No data rows found in Excel file')
    }

    return e.json(200, { headers: headers, data: validRows })
  },
  $apis.requireAuth(),
)
