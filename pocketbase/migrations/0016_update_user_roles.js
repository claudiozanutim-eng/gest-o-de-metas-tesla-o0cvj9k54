migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const roleField = users.fields.getByName('role')

    if (roleField) {
      roleField.values = [
        'Administrator',
        'National Manager',
        'District Manager',
        'Regional Manager',
        'Seller',
        'Sales Assistant',
        'Gerente Nacional',
        'Gerente Distrital Geral',
        'Gerente Distrital',
        'Gerente Regional',
      ]
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const roleField = users.fields.getByName('role')

    if (roleField) {
      roleField.values = [
        'Administrator',
        'National Manager',
        'District Manager',
        'Regional Manager',
        'Seller',
        'Sales Assistant',
      ]
    }

    app.save(users)
  },
)
