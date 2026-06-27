routerAdd(
  'POST',
  '/backend/v1/audit/reset-partial',
  (e) => {
    if (!e.auth || e.auth.getString('role') !== 'Administrador') {
      return e.forbiddenError('Acesso negado: você não tem permissão para executar esta ação.')
    }

    try {
      $app.runInTransaction((txApp) => {
        const db = txApp.db()

        db.newQuery("UPDATE sellers SET area_id = '', user_id = ''").execute()
        db.newQuery("UPDATE goals SET seller_id = '', regional_id = '', area_id = ''").execute()
        db.newQuery("UPDATE actual_performance SET seller_id = ''").execute()
        db.newQuery("UPDATE import_history SET user_id = ''").execute()
        db.newQuery(
          "UPDATE areas SET responsible_id = '' WHERE responsible_id NOT IN (SELECT id FROM users WHERE role = 'Administrador')",
        ).execute()

        db.newQuery('DELETE FROM actual_performance').execute()
        db.newQuery('DELETE FROM goals').execute()
        db.newQuery('DELETE FROM sellers').execute()
        db.newQuery('DELETE FROM import_history').execute()

        db.newQuery("DELETE FROM users WHERE role != 'Administrador'").execute()
      })
      return e.json(200, { success: true })
    } catch (err) {
      return e.badRequestError('Erro ao executar reset parcial: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
