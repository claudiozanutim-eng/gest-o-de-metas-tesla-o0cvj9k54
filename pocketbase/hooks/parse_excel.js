// @deps xlsx@0.18.5
routerAdd(
  'POST',
  '/backend/v1/parse-excel',
  (e) => {
    const xlsx = require('xlsx')
    const body = e.requestInfo().body
    if (!body || !body.data) return e.badRequestError('Missing data')

    try {
      const workbook = xlsx.read(body.data, { type: 'base64' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      const json = xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: '' })
      if (!json || json.length === 0) return e.badRequestError('Empty excel file')

      const headers = Object.keys(json[0])
      return e.json(200, { headers, data: json })
    } catch (err) {
      return e.badRequestError('Invalid Excel file: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
