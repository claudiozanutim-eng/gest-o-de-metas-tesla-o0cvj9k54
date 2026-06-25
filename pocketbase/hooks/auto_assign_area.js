onRecordCreate((e) => {
  if (e.record.getString('regional_id')) return e.next()

  const aName = e.record.getString('name').toUpperCase()
  if (!aName) return e.next()

  const regionals = $app.findRecordsByFilter('regionals', '1=1', '', 100, 0)
  for (const r of regionals) {
    const obs = r.getString('observations')
    if (!obs) continue
    try {
      const scopes = JSON.parse(obs)
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
          e.record.set('regional_id', r.id)
          return e.next()
        }
      }
    } catch (_) {}
  }
  return e.next()
}, 'areas')

onRecordUpdate((e) => {
  if (e.record.getString('regional_id')) return e.next()

  const aName = e.record.getString('name').toUpperCase()
  if (!aName) return e.next()

  const regionals = $app.findRecordsByFilter('regionals', '1=1', '', 100, 0)
  for (const r of regionals) {
    const obs = r.getString('observations')
    if (!obs) continue
    try {
      const scopes = JSON.parse(obs)
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
          e.record.set('regional_id', r.id)
          return e.next()
        }
      }
    } catch (_) {}
  }
  return e.next()
}, 'areas')
