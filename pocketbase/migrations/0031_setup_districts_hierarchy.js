migrate(
  (app) => {
    const dCol = app.findCollectionByNameOrId('districts')

    // 1. Create or get Districts A, B, C, D
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

    // 2. Map Regionals to Districts
    const mapping = {
      'Regional 1': 'Distrito A',
      'Regional 2': 'Distrito A',
      'Regional 3': 'Distrito B',
      'Regional 4': 'Distrito B',
      'Regional 5': 'Distrito C',
      'Regional 6': 'Distrito C',
      'Regional 0': 'Distrito D',
      'Regional 7': 'Distrito D',
      'Regional 8': 'Distrito D',
    }

    const regionals = app.findRecordsByFilter('regionals', '1=1', '', 1000, 0)
    for (const r of regionals) {
      const name = r.getString('name')
      if (mapping[name]) {
        r.set('district_id', districtMap[mapping[name]])
        app.saveNoValidate(r)
      }
    }

    // 3. Update areas district_id
    app
      .db()
      .newQuery(
        `UPDATE areas SET district_id = (SELECT district_id FROM regionals WHERE regionals.id = areas.regional_id) WHERE regional_id != ''`,
      )
      .execute()

    // 4. Update users district_id
    app
      .db()
      .newQuery(
        `UPDATE users SET district_id = (SELECT district_id FROM regionals WHERE regionals.id = users.regional_id) WHERE regional_id != ''`,
      )
      .execute()
    app
      .db()
      .newQuery(
        `UPDATE users SET district_id = (SELECT district_id FROM areas WHERE areas.id = users.area_id) WHERE area_id != ''`,
      )
      .execute()

    // 5. Delete other districts
    const allDistricts = app.findRecordsByFilter('districts', '1=1', '', 1000, 0)
    for (const d of allDistricts) {
      if (!districtNames.includes(d.getString('name'))) {
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
  (app) => {},
)
