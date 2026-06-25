migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('goals')

    if (!col.fields.getByName('focus_fleet')) {
      col.fields.add(new NumberField({ name: 'focus_fleet' }))
    }

    if (!col.fields.getByName('focus_companies')) {
      col.fields.add(new NumberField({ name: 'focus_companies' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('goals')

    if (col.fields.getByName('focus_fleet')) {
      col.fields.removeByName('focus_fleet')
    }

    if (col.fields.getByName('focus_companies')) {
      col.fields.removeByName('focus_companies')
    }

    app.save(col)
  },
)
