routerAdd(
  'POST',
  '/backend/v1/parse-google-sheets',
  (e) => {
    const body = e.requestInfo().body || {}
    let url = body.url
    if (!url) return e.badRequestError('URL is required')

    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!match) return e.badRequestError('Invalid Google Sheets URL')

    const docId = match[1]
    const exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`

    const res = $http.send({
      url: exportUrl,
      method: 'GET',
      timeout: 15,
    })

    if (res.statusCode !== 200) {
      return e.badRequestError('Failed to fetch Google Sheet. Make sure it is public.')
    }

    const text = new TextDecoder().decode(res.body)

    const lines = []
    let currentLine = []
    let currentCell = ''
    let insideQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"' && insideQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else if (char === '"') {
        insideQuotes = !insideQuotes
      } else if (char === ',' && !insideQuotes) {
        currentLine.push(currentCell)
        currentCell = ''
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
        if (char === '\r') i++
        currentLine.push(currentCell)
        lines.push(currentLine)
        currentLine = []
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    if (currentCell || currentLine.length > 0) {
      currentLine.push(currentCell)
      lines.push(currentLine)
    }

    const validLines = lines.filter((l) => l.some((cell) => cell.trim().length > 0))
    if (validLines.length < 2) return e.badRequestError('Empty or invalid Google Sheet')

    const headers = validLines[0].map((h) => h.trim())
    const data = validLines.slice(1).map((line) => {
      const row = {}
      headers.forEach((h, idx) => {
        row[h] = line[idx] !== undefined ? line[idx].trim() : ''
      })
      return row
    })

    return e.json(200, { headers, data })
  },
  $apis.requireAuth(),
)
