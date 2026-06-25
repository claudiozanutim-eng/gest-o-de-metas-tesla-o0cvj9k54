migrate(
  (app) => {
    const regionals = app.findCollectionByNameOrId('regionals')
    regionals.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && district_id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && id = @request.auth.regional_id) || (@request.auth.role = 'Seller' && id = @request.auth.regional_id)"
    regionals.viewRule = regionals.listRule
    app.save(regionals)

    const areas = app.findCollectionByNameOrId('areas')
    areas.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && regional_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Seller' && id = @request.auth.area_id) || responsible_id = @request.auth.id"
    areas.viewRule = areas.listRule
    app.save(areas)

    const districts = app.findCollectionByNameOrId('districts')
    districts.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && id = @request.auth.regional_id.district_id) || (@request.auth.role = 'Seller' && id = @request.auth.district_id)"
    districts.viewRule = districts.listRule
    app.save(districts)
  },
  (app) => {
    const regionals = app.findCollectionByNameOrId('regionals')
    regionals.listRule = "@request.auth.id != ''"
    regionals.viewRule = "@request.auth.id != ''"
    app.save(regionals)

    const areas = app.findCollectionByNameOrId('areas')
    areas.listRule = "@request.auth.id != ''"
    areas.viewRule = "@request.auth.id != ''"
    app.save(areas)

    const districts = app.findCollectionByNameOrId('districts')
    districts.listRule = "@request.auth.id != ''"
    districts.viewRule = "@request.auth.id != ''"
    app.save(districts)
  },
)
