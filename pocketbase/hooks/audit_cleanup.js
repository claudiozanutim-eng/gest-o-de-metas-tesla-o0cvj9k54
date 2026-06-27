routerAdd(
  'POST',
  '/backend/v1/audit/cleanup',
  (e) => {
    if (!e.auth || e.auth.getString('role') !== 'Administrador') {
      return e.forbiddenError('Acesso negado: você não tem permissão para executar esta ação.')
    }

    try {
      $app.runInTransaction((txApp) => {
        const db = txApp.db()

        db.newQuery(
          "DELETE FROM actual_performance WHERE seller_id = '' OR seller_id NOT IN (SELECT id FROM users)",
        ).execute()

        db.newQuery(
          'DELETE FROM actual_performance WHERE NOT EXISTS (SELECT 1 FROM goals g WHERE g.seller_id = actual_performance.seller_id AND g.period = actual_performance.period AND g.metric = actual_performance.metric)',
        ).execute()

        db.newQuery(
          "DELETE FROM goals WHERE seller_id = '' OR seller_id NOT IN (SELECT id FROM users)",
        ).execute()

        db.newQuery(
          "DELETE FROM sellers WHERE (user_id != '' AND user_id NOT IN (SELECT id FROM users)) OR user_id = ''",
        ).execute()
        db.newQuery(
          "DELETE FROM sellers WHERE area_id = '' OR area_id NOT IN (SELECT id FROM areas)",
        ).execute()

        db.newQuery(
          'UPDATE goals SET target_prata = target_ouro - 1 WHERE target_prata >= target_ouro AND target_ouro > 0',
        ).execute()
        db.newQuery(
          'UPDATE goals SET target_bronze = target_prata - 1 WHERE target_bronze >= target_prata AND target_prata > 0',
        ).execute()

        db.newQuery(
          'DELETE FROM goals WHERE id NOT IN (SELECT MIN(id) FROM goals GROUP BY seller_id, area_id, regional_id, period, metric, mix_family)',
        ).execute()

        db.newQuery(
          'DELETE FROM actual_performance WHERE id NOT IN (SELECT MIN(id) FROM actual_performance GROUP BY seller_id, period, metric)',
        ).execute()
      })

      return e.json(200, { success: true })
    } catch (err) {
      return e.badRequestError('Erro ao executar limpeza: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
