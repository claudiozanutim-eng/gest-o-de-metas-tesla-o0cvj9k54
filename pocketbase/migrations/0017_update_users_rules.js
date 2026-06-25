migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Allow all authenticated users to list and view users,
    // so admins and managers can see newly created users in the list.
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"

    // Only administrators, national managers or the user themselves can update/delete
    users.updateRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Gerente Nacional' || id = @request.auth.id"
    users.deleteRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Gerente Nacional' || id = @request.auth.id"

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    const rule = 'id = @request.auth.id'

    users.listRule = rule
    users.viewRule = rule
    users.updateRule = rule
    users.deleteRule = rule

    app.save(users)
  },
)
