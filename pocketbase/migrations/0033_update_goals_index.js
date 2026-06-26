migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('goals')
    try {
      col.removeIndex('idx_goals_unique')
    } catch (_) {}
    col.addIndex('idx_goals_unique_mix', true, 'seller_id, period, metric, mix_family', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('goals')
    try {
      col.removeIndex('idx_goals_unique_mix')
    } catch (_) {}
    col.addIndex('idx_goals_unique', true, 'seller_id, period, metric', '')
    app.save(col)
  },
)
