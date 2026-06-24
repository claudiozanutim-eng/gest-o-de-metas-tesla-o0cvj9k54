migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: [
            'Administrator',
            'National Manager',
            'District Manager',
            'Regional Manager',
            'Seller',
            'Sales Assistant',
          ],
          maxSelect: 1,
        }),
      )
    }

    const districts = app.findCollectionByNameOrId('districts')
    if (!users.fields.getByName('district_id')) {
      users.fields.add(
        new RelationField({
          name: 'district_id',
          collectionId: districts.id,
          maxSelect: 1,
        }),
      )
    }

    const regionals = app.findCollectionByNameOrId('regionals')
    if (!users.fields.getByName('regional_id')) {
      users.fields.add(
        new RelationField({
          name: 'regional_id',
          collectionId: regionals.id,
          maxSelect: 1,
        }),
      )
    }

    const areas = app.findCollectionByNameOrId('areas')
    if (!users.fields.getByName('area_id')) {
      users.fields.add(
        new RelationField({
          name: 'area_id',
          collectionId: areas.id,
          maxSelect: 1,
        }),
      )
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('role')
    users.fields.removeByName('district_id')
    users.fields.removeByName('regional_id')
    users.fields.removeByName('area_id')
    app.save(users)
  },
)
