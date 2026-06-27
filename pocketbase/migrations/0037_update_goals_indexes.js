migrate(
  (app) => {
    // Deduplicate entries safely before establishing a stricter unique constraint
    app
      .db()
      .newQuery(`
    DELETE FROM goals WHERE id NOT IN (
      SELECT MIN(id) FROM goals GROUP BY seller_id, area_id, regional_id, period, metric, mix_family
    )
  `)
      .execute()

    const col = app.findCollectionByNameOrId('goals')

    try {
      col.removeIndex('idx_goals_unique_mix')
    } catch (_) {}

    col.addIndex(
      'idx_goals_unique_mix_v2',
      true,
      'seller_id, area_id, regional_id, period, metric, mix_family',
      '',
    )

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('goals')

    try {
      col.removeIndex('idx_goals_unique_mix_v2')
    } catch (_) {}

    col.addIndex('idx_goals_unique_mix', true, 'seller_id, period, metric, mix_family', '')

    app.save(col)
  },
)
