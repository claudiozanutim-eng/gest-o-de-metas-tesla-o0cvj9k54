migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('force_password_change')) {
      users.fields.add(
        new BoolField({
          name: 'force_password_change',
        }),
      )
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (users.fields.getByName('force_password_change')) {
      users.fields.removeByName('force_password_change')
      app.save(users)
    }
  },
)
