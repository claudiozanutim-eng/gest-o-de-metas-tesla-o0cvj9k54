migrate(
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')
    if (!goals.fields.getByName('mix_family')) {
      goals.fields.add(new TextField({ name: 'mix_family', required: false }))
    }
    app.save(goals)

    const ap = app.findCollectionByNameOrId('actual_performance')
    if (!ap.fields.getByName('mix_family')) {
      ap.fields.add(new TextField({ name: 'mix_family', required: false }))
    }
    if (!ap.fields.getByName('focus_fleet')) {
      ap.fields.add(new NumberField({ name: 'focus_fleet', required: false }))
    }
    if (!ap.fields.getByName('focus_companies')) {
      ap.fields.add(new NumberField({ name: 'focus_companies', required: false }))
    }
    app.save(ap)

    const sysCol = app.findCollectionByNameOrId('system_parameters')
    try {
      app.findFirstRecordByData('system_parameters', 'key', 'tax_rate')
    } catch (_) {
      const record = new Record(sysCol)
      record.set('key', 'tax_rate')
      record.set('value', 0.32)
      record.set('description', 'Tax deduction for net commission value')
      app.save(record)
    }
  },
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')
    goals.fields.removeByName('mix_family')
    app.save(goals)

    const ap = app.findCollectionByNameOrId('actual_performance')
    ap.fields.removeByName('mix_family')
    ap.fields.removeByName('focus_fleet')
    ap.fields.removeByName('focus_companies')
    app.save(ap)

    try {
      const record = app.findFirstRecordByData('system_parameters', 'key', 'tax_rate')
      app.delete(record)
    } catch (_) {}
  },
)
