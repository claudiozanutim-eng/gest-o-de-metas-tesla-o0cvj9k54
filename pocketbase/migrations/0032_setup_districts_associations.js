migrate(
  (app) => {
    const dCol = app.findCollectionByNameOrId('districts')
    const districtNames = ['Distrito A', 'Distrito B', 'Distrito C', 'Distrito D']
    const districtMap = {}

    for (const name of districtNames) {
      try {
        const rec = app.findFirstRecordByData('districts', 'name', name)
        districtMap[name] = rec.id
      } catch (_) {
        const rec = new Record(dCol)
        rec.set('name', name)
        rec.set('is_active', true)
        app.saveNoValidate(rec)
        districtMap[name] = rec.id
      }
    }

    const regionals = app.findRecordsByFilter('regionals', '1=1', '', 1000, 0)
    for (const r of regionals) {
      const name = r.getString('name') || ''

      if (name.includes('1') || name.includes('2')) {
        r.set('district_id', districtMap['Distrito A'])
        app.saveNoValidate(r)
      } else if (name.includes('3') || name.includes('4')) {
        r.set('district_id', districtMap['Distrito B'])
        app.saveNoValidate(r)
      } else if (name.includes('5') || name.includes('6')) {
        r.set('district_id', districtMap['Distrito C'])
        app.saveNoValidate(r)
      } else if (name.includes('0') || name.includes('7') || name.includes('8')) {
        r.set('district_id', districtMap['Distrito D'])
        app.saveNoValidate(r)
      }
    }

    // Delete any legacy/temporary districts named "Brasil" or containing corrupted characters.
    const allDistricts = app.findRecordsByFilter('districts', '1=1', '', 1000, 0)
    for (const d of allDistricts) {
      const name = d.getString('name') || ''
      if (name === 'Brasil' || name.includes('')) {
        app
          .db()
          .newQuery(`UPDATE regionals SET district_id = '' WHERE district_id = {:id}`)
          .bind({ id: d.id })
          .execute()
        app
          .db()
          .newQuery(`UPDATE areas SET district_id = '' WHERE district_id = {:id}`)
          .bind({ id: d.id })
          .execute()
        app
          .db()
          .newQuery(`UPDATE users SET district_id = '' WHERE district_id = {:id}`)
          .bind({ id: d.id })
          .execute()
        app.delete(d)
      }
    }
  },
  (app) => {
    // Revert not strictly needed for data manipulation
  },
)
