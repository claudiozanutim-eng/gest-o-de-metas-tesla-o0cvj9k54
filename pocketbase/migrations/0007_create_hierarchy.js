migrate(
  (app) => {
    const districts = new Collection({
      name: 'districts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
      updateRule: "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
      deleteRule: "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(districts)

    const regionals = new Collection({
      name: 'regionals',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
      updateRule: "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
      deleteRule: "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'district_id',
          type: 'relation',
          collectionId: districts.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(regionals)

    const areas = new Collection({
      name: 'areas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
      updateRule: "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
      deleteRule: "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'regional_id',
          type: 'relation',
          collectionId: regionals.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(areas)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('areas'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('regionals'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('districts'))
    } catch (_) {}
  },
)
