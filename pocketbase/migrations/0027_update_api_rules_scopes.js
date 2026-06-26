migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const records = app.findRecordsByFilter('users', "role != ''", '', 1000, 0)
    for (const record of records) {
      const role = record.getString('role')
      let changed = false
      if (role === 'Gerente Nacional') {
        record.set('role', 'National Manager')
        changed = true
      }
      if (role === 'Gerente Distrital Geral' || role === 'Gerente Distrital') {
        record.set('role', 'District Manager')
        changed = true
      }
      if (role === 'Gerente Regional') {
        record.set('role', 'Regional Manager')
        changed = true
      }
      if (role === 'Vendedor') {
        record.set('role', 'Seller')
        changed = true
      }

      const areaId = record.getString('area_id')
      const regionalId = record.getString('regional_id')
      if (areaId) {
        try {
          const area = app.findRecordById('areas', areaId)
          const areaRegId = area.getString('regional_id')
          if (areaRegId) {
            record.set('regional_id', areaRegId)
            changed = true
            const reg = app.findRecordById('regionals', areaRegId)
            if (reg.getString('district_id')) {
              record.set('district_id', reg.getString('district_id'))
            }
          }
        } catch (e) {}
      } else if (regionalId) {
        try {
          const reg = app.findRecordById('regionals', regionalId)
          if (reg.getString('district_id')) {
            record.set('district_id', reg.getString('district_id'))
            changed = true
          }
        } catch (e) {}
      }
      if (changed) {
        app.saveNoValidate(record)
      }
    }

    users.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || id = @request.auth.id || (@request.auth.role = 'District Manager' && district_id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Seller' && id = @request.auth.id)"
    users.viewRule = users.listRule
    app.save(users)

    const districts = app.findCollectionByNameOrId('districts')
    districts.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && id = @request.auth.regional_id.district_id) || (@request.auth.role = 'Seller' && id = @request.auth.district_id)"
    districts.viewRule = districts.listRule
    app.save(districts)

    const regionals = app.findCollectionByNameOrId('regionals')
    regionals.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && district_id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && id = @request.auth.regional_id) || (@request.auth.role = 'Seller' && id = @request.auth.regional_id)"
    regionals.viewRule = regionals.listRule
    app.save(regionals)

    const areas = app.findCollectionByNameOrId('areas')
    areas.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && (regional_id.district_id = @request.auth.district_id || district_id = @request.auth.district_id)) || (@request.auth.role = 'Regional Manager' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Seller' && id = @request.auth.area_id) || responsible_id = @request.auth.id"
    areas.viewRule = areas.listRule
    app.save(areas)

    const goals = app.findCollectionByNameOrId('goals')
    const goalsRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id"
    goals.listRule = goalsRule
    goals.viewRule = goalsRule
    goals.createRule = goalsRule
    goals.updateRule = goalsRule
    app.save(goals)

    const ap = app.findCollectionByNameOrId('actual_performance')
    ap.listRule = goalsRule
    ap.viewRule = goalsRule
    ap.createRule = goalsRule
    ap.updateRule = goalsRule
    app.save(ap)

    const sellers = app.findCollectionByNameOrId('sellers')
    sellers.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && user_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && user_id.regional_id = @request.auth.regional_id) || user_id = @request.auth.id"
    sellers.viewRule = sellers.listRule
    app.save(sellers)
  },
  (app) => {
    // Add fallback empty functions if needed
  },
)
