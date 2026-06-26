migrate(
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')
    goals.deleteRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Gerente Nacional' || @request.auth.role = 'Sales Assistant'"
    app.save(goals)

    const sellers = app.findCollectionByNameOrId('sellers')
    sellers.deleteRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Gerente Nacional'"
    app.save(sellers)

    const importHistory = app.findCollectionByNameOrId('import_history')
    importHistory.deleteRule = "@request.auth.id != ''"
    app.save(importHistory)
  },
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')
    goals.deleteRule = "@request.auth.role = 'Administrator'"
    app.save(goals)

    const sellers = app.findCollectionByNameOrId('sellers')
    sellers.deleteRule =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager'"
    app.save(sellers)

    const importHistory = app.findCollectionByNameOrId('import_history')
    importHistory.deleteRule = null
    app.save(importHistory)
  },
)
