migrate(
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')
    goals.fields.add(new NumberField({ name: 'target_daily_coverage' }))
    goals.fields.add(new NumberField({ name: 'target_weekly_coverage' }))
    goals.fields.add(new NumberField({ name: 'target_monthly_coverage' }))
    app.save(goals)

    const perf = app.findCollectionByNameOrId('actual_performance')
    perf.fields.add(new NumberField({ name: 'actual_coverage' }))
    app.save(perf)
  },
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')
    goals.fields.removeByName('target_daily_coverage')
    goals.fields.removeByName('target_weekly_coverage')
    goals.fields.removeByName('target_monthly_coverage')
    app.save(goals)

    const perf = app.findCollectionByNameOrId('actual_performance')
    perf.fields.removeByName('actual_coverage')
    app.save(perf)
  },
)
