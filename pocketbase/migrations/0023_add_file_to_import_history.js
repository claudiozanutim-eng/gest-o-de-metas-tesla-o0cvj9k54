migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('import_history')
    if (!col.fields.getByName('file')) {
      col.fields.add(new FileField({ name: 'file', maxSelect: 1, maxSize: 52428800 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('import_history')
    col.fields.removeByName('file')
    app.save(col)
  },
)
