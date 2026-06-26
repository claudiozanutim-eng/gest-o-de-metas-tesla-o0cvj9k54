migrate(
  (app) => {
    let districtId = ''
    try {
      const district = app.findFirstRecordByData('districts', 'name', 'Brasil')
      districtId = district.id
    } catch (_) {
      const dCol = app.findCollectionByNameOrId('districts')
      const newD = new Record(dCol)
      newD.set('name', 'Brasil')
      newD.set('is_active', true)
      app.saveNoValidate(newD)
      districtId = newD.id
    }

    const standardRegionals = [
      { name: 'Regional 0', color: '#e91e63', num: 0 },
      { name: 'Regional 1', color: '#34a853', num: 1 },
      { name: 'Regional 2', color: '#673ab7', num: 2 },
      { name: 'Regional 3', color: '#ff9800', num: 3 },
      { name: 'Regional 4', color: '#ffeb3b', num: 4 },
      { name: 'Regional 5', color: '#42a5f5', num: 5 },
      { name: 'Regional 6', color: '#f44336', num: 6 },
      { name: 'Regional 7', color: '#ff7043', num: 7 },
      { name: 'Regional 8', color: '#9e9e9e', num: 8 },
    ]

    const regionals = app.findRecordsByFilter('regionals', '1=1', '', 10000, 0)
    const validRegionals = {}

    function remapRegional(oldId, newId) {
      app
        .db()
        .newQuery(`UPDATE users SET regional_id = {:newId} WHERE regional_id = {:oldId}`)
        .bind({ newId, oldId })
        .execute()
      app
        .db()
        .newQuery(`UPDATE areas SET regional_id = {:newId} WHERE regional_id = {:oldId}`)
        .bind({ newId, oldId })
        .execute()
      app
        .db()
        .newQuery(`UPDATE goals SET regional_id = {:newId} WHERE regional_id = {:oldId}`)
        .bind({ newId, oldId })
        .execute()
    }

    // 1. Identify valid and recoverable regionals
    for (const reg of regionals) {
      const name = reg.getString('name') || ''
      const color = reg.getString('color_code') || ''
      const isCorrupted =
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/.test(name) || name.trim() === ''

      let matchedStd = standardRegionals.find((s) => s.name === name || s.color === color)

      if (!matchedStd) {
        const numMatch = name.match(/\b([0-8])\b/)
        if (numMatch && !isCorrupted) {
          matchedStd = standardRegionals.find((s) => s.num === parseInt(numMatch[1], 10))
        }
      }

      if (matchedStd) {
        if (!validRegionals[matchedStd.num]) {
          validRegionals[matchedStd.num] = reg
          let changed = false
          if (name !== matchedStd.name) {
            reg.set('name', matchedStd.name)
            changed = true
          }
          if (color !== matchedStd.color) {
            reg.set('color_code', matchedStd.color)
            changed = true
          }
          if (reg.getString('district_id') !== districtId) {
            reg.set('district_id', districtId)
            changed = true
          }
          if (changed) {
            app.saveNoValidate(reg)
          }
        } else {
          // Duplicate found, remap relations and delete duplicate
          remapRegional(reg.id, validRegionals[matchedStd.num].id)
          app.delete(reg)
        }
      } else {
        if (isCorrupted) {
          // Delete unrecoverable corrupted regionals (nullify relations first to avoid dangling references)
          app
            .db()
            .newQuery(`UPDATE users SET regional_id = '' WHERE regional_id = {:id}`)
            .bind({ id: reg.id })
            .execute()
          app
            .db()
            .newQuery(`UPDATE areas SET regional_id = '' WHERE regional_id = {:id}`)
            .bind({ id: reg.id })
            .execute()
          app
            .db()
            .newQuery(`UPDATE goals SET regional_id = '' WHERE regional_id = {:id}`)
            .bind({ id: reg.id })
            .execute()
          app.delete(reg)
        }
      }
    }

    // 2. Create missing standard regionals
    for (const std of standardRegionals) {
      if (!validRegionals[std.num]) {
        const col = app.findCollectionByNameOrId('regionals')
        const newReg = new Record(col)
        newReg.set('name', std.name)
        newReg.set('color_code', std.color)
        newReg.set('district_id', districtId)
        newReg.set('is_active', true)
        app.saveNoValidate(newReg)
        validRegionals[std.num] = newReg
      }
    }

    // 3. Clean up corrupted areas and enforce district link
    const areas = app.findRecordsByFilter('areas', '1=1', '', 10000, 0)

    for (const area of areas) {
      const name = area.getString('name') || ''
      const isCorrupted =
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/.test(name) || name.trim() === ''

      if (isCorrupted) {
        const match = name.match(/\d+/)
        if (match) {
          // Recover area name using extracted number
          area.set('name', `Área ${match[0]}`)
          area.set('district_id', districtId)
          app.saveNoValidate(area)
        } else {
          // Delete unrecoverable corrupted area
          app
            .db()
            .newQuery(`UPDATE users SET area_id = '' WHERE area_id = {:id}`)
            .bind({ id: area.id })
            .execute()
          app
            .db()
            .newQuery(`UPDATE sellers SET area_id = '' WHERE area_id = {:id}`)
            .bind({ id: area.id })
            .execute()
          app
            .db()
            .newQuery(`UPDATE goals SET area_id = '' WHERE area_id = {:id}`)
            .bind({ id: area.id })
            .execute()
          app.delete(area)
        }
      } else {
        let changed = false
        if (area.getString('district_id') !== districtId) {
          area.set('district_id', districtId)
          changed = true
        }
        if (changed) {
          app.saveNoValidate(area)
        }
      }
    }
  },
  (app) => {
    // Reverting data deletion is not possible safely without a snapshot
  },
)
