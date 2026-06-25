// @deps xlsx@0.18.5
routerAdd(
  'POST',
  '/backend/v1/parse-google-sheets',
  (e) => {
    try {
      const { read, utils } = require('xlsx')
      const body = e.requestInfo().body || {}
      let url = body.url
      if (!url) return e.badRequestError('missing url')

      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
      if (!match) return e.badRequestError('Invalid Google Sheets URL format')
      const sheetId = match[1]

      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

      const res = $http.send({ url: exportUrl, method: 'GET', timeout: 30 })
      if (res.statusCode !== 200) {
        return e.badRequestError(
          'Failed to fetch from Google Sheets. Ensure the sheet is published to the web or anyone with the link can view.',
        )
      }

      const decoder = new TextDecoder('utf-8')
      const csvStr = decoder.decode(res.body)

      const wb = read(csvStr, { type: 'string' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const data = utils.sheet_to_json(sheet, { defval: '' })

      let headers = []
      if (data.length > 0) headers = Object.keys(data[0])

      return e.json(200, { data, headers })
    } catch (err) {
      $app.logger().error('Parse Google Sheets failed', 'error', err.message)
      return e.badRequestError('Failed to parse Google Sheets. ' + err.message)
    }
  },
  $apis.requireAuth(),
)
