migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('is_active')) {
      users.fields.add(new BoolField({ name: 'is_active' }))
    }
    app.save(users)

    const districts = app.findCollectionByNameOrId('districts')
    if (!districts.fields.getByName('is_active')) {
      districts.fields.add(new BoolField({ name: 'is_active' }))
    }
    app.save(districts)

    const regionals = app.findCollectionByNameOrId('regionals')
    if (!regionals.fields.getByName('is_active')) {
      regionals.fields.add(new BoolField({ name: 'is_active' }))
    }
    if (!regionals.fields.getByName('color_code')) {
      regionals.fields.add(new TextField({ name: 'color_code' }))
    }
    if (!regionals.fields.getByName('observations')) {
      regionals.fields.add(new TextField({ name: 'observations' }))
    }
    app.save(regionals)

    const areas = app.findCollectionByNameOrId('areas')
    if (!areas.fields.getByName('is_active')) {
      areas.fields.add(new BoolField({ name: 'is_active' }))
    }
    if (!areas.fields.getByName('responsible_id')) {
      areas.fields.add(
        new RelationField({
          name: 'responsible_id',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }
    app.save(areas)

    const families = app.findCollectionByNameOrId('product_families')
    if (!families.fields.getByName('weight')) {
      families.fields.add(new NumberField({ name: 'weight' }))
    }
    if (!families.fields.getByName('composition')) {
      families.fields.add(new JSONField({ name: 'composition' }))
    }
    app.save(families)

    try {
      app.findCollectionByNameOrId('sellers')
    } catch (_) {
      const sellers = new Collection({
        name: 'sellers',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
        updateRule:
          "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
        deleteRule: "@request.auth.role = 'Administrator'",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'code', type: 'text', required: true },
          {
            name: 'area_id',
            type: 'relation',
            required: true,
            collectionId: areas.id,
            maxSelect: 1,
          },
          {
            name: 'user_id',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(sellers)
    }
  },
  (app) => {
    try {
      const sellers = app.findCollectionByNameOrId('sellers')
      app.delete(sellers)
    } catch (_) {}
  },
)
