routerAdd(
  'POST',
  '/backend/v1/load-structure',
  (e) => {
    const regionalsDef = [
      {
        name: 'Regional 1',
        scopes: ['CSP', 'GSP-1', 'GSP-2', 'GSP-3', 'GSP-4', 'ISP-1', 'ISP-2', 'ISP-3', 'LSP'],
        color: '#22c55e',
      },
      { name: 'Regional 2', scopes: ['RS', 'SC', 'PR'], color: '#a855f7' },
      { name: 'Regional 3', scopes: ['RJ', 'ES'], color: '#fdba74' },
      { name: 'Regional 4', scopes: ['MG'], color: '#eab308' },
      { name: 'Regional 5', scopes: ['BA', 'AL', 'SE', 'PE', 'PB', 'RN'], color: '#7dd3fc' },
      { name: 'Regional 6', scopes: ['AP', 'AM', 'AC', 'RR', 'PA'], color: '#ef4444' },
      { name: 'Regional 7', scopes: ['RO', 'MT', 'MS'], color: '#c2410c' },
      { name: 'Regional 8', scopes: ['GO', 'DF'], color: '#6b7280' },
      { name: 'Regional 0', scopes: ['TO', 'CE', 'PI', 'MA'], color: '#7f1d1d' },
    ]

    let districtId = null
    try {
      const d = $app.findFirstRecordByData('districts', 'name', 'Brasil')
      districtId = d.id
    } catch (_) {
      const col = $app.findCollectionByNameOrId('districts')
      const d = new Record(col)
      d.set('name', 'Brasil')
      d.set('is_active', true)
      $app.save(d)
      districtId = d.id
    }

    let createdReg = 0
    let updatedReg = 0
    const regMap = {}

    const regCol = $app.findCollectionByNameOrId('regionals')
    for (const def of regionalsDef) {
      let r
      try {
        r = $app.findFirstRecordByData('regionals', 'name', def.name)
        r.set('district_id', districtId)
        r.set('color_code', def.color)
        r.set('observations', JSON.stringify(def.scopes))
        $app.save(r)
        updatedReg++
      } catch (_) {
        r = new Record(regCol)
        r.set('name', def.name)
        r.set('district_id', districtId)
        r.set('color_code', def.color)
        r.set('observations', JSON.stringify(def.scopes))
        r.set('is_active', true)
        $app.save(r)
        createdReg++
      }
      regMap[r.id] = def.scopes
    }

    let areasLinked = 0
    let pendingReview = 0
    const areas = $app.findRecordsByFilter('areas', '1=1', '', 10000, 0)
    for (const a of areas) {
      let matchedRegId = null
      const aName = a.getString('name').toUpperCase()

      for (const [rId, scopes] of Object.entries(regMap)) {
        for (const scope of scopes) {
          if (
            aName === scope ||
            aName.startsWith(scope + ' ') ||
            aName.startsWith(scope + '-') ||
            aName.startsWith(scope + '_') ||
            aName.includes(' ' + scope + ' ') ||
            aName.includes(' ' + scope + '-') ||
            aName.endsWith(' ' + scope) ||
            aName.endsWith('-' + scope)
          ) {
            matchedRegId = rId
            break
          }
        }
        if (matchedRegId) break
      }

      if (matchedRegId) {
        if (a.getString('regional_id') !== matchedRegId) {
          a.set('regional_id', matchedRegId)
          $app.save(a)
          areasLinked++
        }
      } else {
        if (!a.getString('regional_id')) {
          pendingReview++
        }
      }
    }

    return e.json(200, {
      regionals_created: createdReg,
      regionals_updated: updatedReg,
      areas_linked: areasLinked,
      pending_review: pendingReview,
      scopes_associated: regionalsDef.reduce((acc, curr) => acc + curr.scopes.length, 0),
    })
  },
  $apis.requireAuth(),
)
