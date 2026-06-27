routerAdd(
  'POST',
  '/backend/v1/audit/reset-partial',
  (e) => {
    $app.runInTransaction((txApp) => {
      const db = txApp.db()
      db.newQuery('DELETE FROM actual_performance').execute()
      db.newQuery('DELETE FROM goals').execute()
      db.newQuery('DELETE FROM sellers').execute()
      db.newQuery('DELETE FROM import_history').execute()
      // Do not delete Superusers
      db.newQuery("DELETE FROM users WHERE role != 'Administrador'").execute()
    })
    return e.json(200, { success: true })
  },
  $apis.requireSuperuserAuth(),
)
