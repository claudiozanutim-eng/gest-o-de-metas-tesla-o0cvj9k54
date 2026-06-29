migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('actual_performance')
    const field = col.fields.getByName('actual_value')
    field.required = false
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('actual_performance')
    const field = col.fields.getByName('actual_value')
    field.required = true
    app.save(col)
  },
)
