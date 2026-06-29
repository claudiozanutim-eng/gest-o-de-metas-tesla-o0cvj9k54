routerAdd(
  'POST',
  '/backend/v1/parse-excel',
  (e) => {
    const body = e.requestInfo().body || {}
    const b64 = body.data
    if (!b64) return e.badRequestError('No data provided')

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

    var text
    try {
      text = new TextDecoder('utf-8').decode(bytes)
    } catch (err) {
      return e.badRequestError('Failed to decode file text')
    }

    var trimmed = text.replace(/^\uFEFF/, '').trim()
    if (!trimmed) {
      return e.badRequestError('Empty file content')
    }

    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
      var jsonData
      try {
        jsonData = JSON.parse(trimmed)
      } catch (err) {
        return e.badRequestError('Invalid JSON: ' + err.message)
      }

      var arr = Array.isArray(jsonData) ? jsonData : [jsonData]
      if (arr.length === 0) {
        return e.badRequestError('No data rows found in JSON')
      }

      var jsonHeaders = Object.keys(arr[0])
      var jsonRows = arr.map(function (row) {
        var rowObj = {}
        jsonHeaders.forEach(function (h) {
          rowObj[h] = row[h] !== undefined && row[h] !== null ? String(row[h]).trim() : ''
        })
        return rowObj
      })

      var jsonValid = jsonRows.filter(function (r) {
        return Object.values(r).some(function (v) {
          return v && v.length > 0
        })
      })

      if (jsonValid.length === 0) {
        return e.badRequestError('No data rows found in JSON')
      }

      return e.json(200, { headers: jsonHeaders, data: jsonValid })
    }

    function parseCSVLine(line) {
      var result = []
      var current = ''
      var inQuotes = false
      for (var i = 0; i < line.length; i++) {
        var ch = line[i]
        if (inQuotes) {
          if (ch === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              current += '"'
              i++
            } else {
              inQuotes = false
            }
          } else {
            current += ch
          }
        } else {
          if (ch === '"') {
            inQuotes = true
          } else if (ch === ',' || ch === ';') {
            result.push(current)
            current = ''
          } else {
            current += ch
          }
        }
      }
      result.push(current)
      return result
    }

    var lines = trimmed.split(/\r\n|\r|\n/).filter(function (l) {
      return l.trim().length > 0
    })

    if (lines.length < 2) {
      return e.badRequestError('No data rows found in CSV file')
    }

    var headers = parseCSVLine(lines[0]).map(function (h) {
      return h.trim()
    })

    var dataRows = lines.slice(1).map(function (line) {
      var values = parseCSVLine(line)
      var rowObj = {}
      headers.forEach(function (h, idx) {
        rowObj[h] = values[idx] !== undefined ? values[idx].trim() : ''
      })
      return rowObj
    })

    var validRows = dataRows.filter(function (r) {
      return Object.values(r).some(function (v) {
        return v && v.trim().length > 0
      })
    })

    if (validRows.length === 0) {
      return e.badRequestError('No data rows found in CSV file')
    }

    return e.json(200, { headers: headers, data: validRows })
  },
  $apis.requireAuth(),
)
