migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('areas')

    if (!col.fields.getByName('district_id')) {
      col.fields.add(
        new RelationField({
          name: 'district_id',
          collectionId: app.findCollectionByNameOrId('districts').id,
          maxSelect: 1,
        }),
      )
    }

    const regionalField = col.fields.getByName('regional_id')
    if (regionalField) {
      regionalField.required = false
    }

    col.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && (regional_id.district_id = @request.auth.district_id || district_id = @request.auth.district_id)) || (@request.auth.role = 'Regional Manager' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Seller' && id = @request.auth.area_id) || responsible_id = @request.auth.id"
    col.viewRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && (regional_id.district_id = @request.auth.district_id || district_id = @request.auth.district_id)) || (@request.auth.role = 'Regional Manager' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Seller' && id = @request.auth.area_id) || responsible_id = @request.auth.id"

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('areas')

    if (col.fields.getByName('district_id')) {
      col.fields.removeByName('district_id')
    }

    const regionalField = col.fields.getByName('regional_id')
    if (regionalField) {
      regionalField.required = true
    }

    col.listRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && regional_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Seller' && id = @request.auth.area_id) || responsible_id = @request.auth.id"
    col.viewRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && regional_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Seller' && id = @request.auth.area_id) || responsible_id = @request.auth.id"

    app.save(col)
  },
)
