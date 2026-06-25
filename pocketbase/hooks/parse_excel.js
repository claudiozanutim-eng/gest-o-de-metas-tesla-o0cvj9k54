// @deps xlsx@0.18.5
routerAdd(
  'POST',
  '/backend/v1/parse-excel',
  (e) => {
    try {
      const { read, utils } = require('xlsx')
      const body = e.requestInfo().body || {}
      if (!body.base64) return e.badRequestError('missing base64 content')

      const wb = read(body.base64, { type: 'base64' })
      if (!wb.SheetNames.length) return e.badRequestError('No sheets found in Excel file')

      const sheet = wb.Sheets[wb.SheetNames[0]]
      const data = utils.sheet_to_json(sheet, { defval: '' })

      let headers = []
      if (data.length > 0) {
        headers = Object.keys(data[0])
      } else {
        return e.badRequestError('Excel file is empty')
      }

      return e.json(200, { data, headers })
    } catch (err) {
      $app.logger().error('Parse excel failed', 'error', err.message)
      return e.badRequestError('Failed to parse Excel file. ' + err.message)
    }
  },
  $apis.requireAuth(),
)
