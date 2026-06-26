migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('goals')

    col.fields.add(new NumberField({ name: 'target_base', required: false }))
    col.fields.add(new NumberField({ name: 'target_bronze', required: false }))
    col.fields.add(new NumberField({ name: 'target_prata', required: false }))
    col.fields.add(new NumberField({ name: 'target_ouro', required: false }))

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('goals')

    col.fields.add(new NumberField({ name: 'target_base', required: true }))
    col.fields.add(new NumberField({ name: 'target_bronze', required: true }))
    col.fields.add(new NumberField({ name: 'target_prata', required: true }))
    col.fields.add(new NumberField({ name: 'target_ouro', required: true }))

    app.save(col)
  },
)
