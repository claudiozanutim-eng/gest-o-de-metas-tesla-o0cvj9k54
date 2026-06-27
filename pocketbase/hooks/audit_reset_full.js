routerAdd(
  'POST',
  '/backend/v1/audit/reset-full',
  (e) => {
    try {
      $app.runInTransaction((txApp) => {
        const db = txApp.db()

        // Break FK cycles
        db.newQuery("UPDATE users SET district_id = '', regional_id = '', area_id = ''").execute()
        db.newQuery(
          "UPDATE areas SET responsible_id = '', district_id = '', regional_id = ''",
        ).execute()
        db.newQuery("UPDATE regionals SET district_id = ''").execute()
        db.newQuery("UPDATE sellers SET area_id = '', user_id = ''").execute()
        db.newQuery("UPDATE goals SET seller_id = '', regional_id = '', area_id = ''").execute()
        db.newQuery("UPDATE actual_performance SET seller_id = ''").execute()
        db.newQuery("UPDATE import_history SET user_id = ''").execute()

        // Delete operational and structural data
        db.newQuery('DELETE FROM actual_performance').execute()
        db.newQuery('DELETE FROM goals').execute()
        db.newQuery('DELETE FROM sellers').execute()
        db.newQuery('DELETE FROM areas').execute()
        db.newQuery('DELETE FROM regionals').execute()
        db.newQuery('DELETE FROM districts').execute()
        db.newQuery('DELETE FROM product_families').execute()
        db.newQuery('DELETE FROM commission_tiers').execute()
        db.newQuery('DELETE FROM import_history').execute()

        // Do not delete Superusers
        db.newQuery("DELETE FROM users WHERE role != 'Administrador'").execute()
      })
      return e.json(200, { success: true })
    } catch (err) {
      return e.badRequestError(err.message)
    }
  },
  $apis.requireSuperuserAuth(),
)
