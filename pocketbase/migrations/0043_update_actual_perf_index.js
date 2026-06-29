migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('actual_performance')
    col.removeIndex('idx_actual_perf_unique')
    col.addIndex('idx_actual_perf_unique', true, 'seller_id, period, metric, mix_family', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('actual_performance')
    col.removeIndex('idx_actual_perf_unique')
    app
      .db()
      .newQuery(`
    DELETE FROM actual_performance WHERE id NOT IN (
      SELECT MIN(id) FROM actual_performance GROUP BY seller_id, period, metric
    )
  `)
      .execute()
    col.addIndex('idx_actual_perf_unique', true, 'seller_id, period, metric', '')
    app.save(col)
  },
)
