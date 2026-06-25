migrate(
  (app) => {
    const tiersCol = new Collection({
      name: 'commission_tiers',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'Administrator'",
      updateRule: "@request.auth.role = 'Administrator'",
      deleteRule: "@request.auth.role = 'Administrator'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'order', type: 'number', required: true },
        { name: 'is_active', type: 'bool' },
        { name: 'color', type: 'text' },
        { name: 'min_pct', type: 'number' },
        { name: 'max_pct', type: 'number' },
        { name: 'commission_pct', type: 'number' },
        { name: 'multiplier', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(tiersCol)

    const defaultTiers = [
      {
        name: 'Atual 80',
        order: 1,
        is_active: true,
        color: '#ef4444',
        min_pct: 0,
        max_pct: 79.99,
        commission_pct: 0,
        multiplier: 0,
      },
      {
        name: 'Atual 100',
        order: 2,
        is_active: true,
        color: '#f97316',
        min_pct: 80,
        max_pct: 94.99,
        commission_pct: 0,
        multiplier: 0,
      },
      {
        name: 'Base',
        order: 3,
        is_active: true,
        color: '#71717a',
        min_pct: 95,
        max_pct: 99.99,
        commission_pct: 2,
        multiplier: 0.02,
      },
      {
        name: 'Bronze',
        order: 4,
        is_active: true,
        color: '#d97706',
        min_pct: 100,
        max_pct: 109.99,
        commission_pct: 3.5,
        multiplier: 0.035,
      },
      {
        name: 'Prata',
        order: 5,
        is_active: true,
        color: '#9ca3af',
        min_pct: 110,
        max_pct: 124.99,
        commission_pct: 5,
        multiplier: 0.05,
      },
      {
        name: 'Ouro',
        order: 6,
        is_active: true,
        color: '#eab308',
        min_pct: 125,
        max_pct: 999.99,
        commission_pct: 6.5,
        multiplier: 0.065,
      },
    ]

    for (const t of defaultTiers) {
      const record = new Record(tiersCol)
      for (const [k, v] of Object.entries(t)) {
        record.set(k, v)
      }
      app.save(record)
    }

    const sysCol = app.findCollectionByNameOrId('system_parameters')

    try {
      app.findFirstRecordByData('system_parameters', 'key', 'commission_weights')
    } catch (_) {
      const wRec = new Record(sysCol)
      wRec.set('key', 'commission_weights')
      wRec.set('value', { revenue: 50, mix: 25, coverage: 25 })
      wRec.set('description', 'Pesos dos critérios de comissão')
      app.save(wRec)
    }

    try {
      app.findFirstRecordByData('system_parameters', 'key', 'financial_adjustments')
    } catch (_) {
      const fRec = new Record(sysCol)
      fRec.set('key', 'financial_adjustments')
      fRec.set('value', { rate: 0, tax: 32, retention: 0, discount: 0 })
      fRec.set('description', 'Ajustes financeiros (%)')
      app.save(fRec)
    }
  },
  (app) => {
    try {
      const tiersCol = app.findCollectionByNameOrId('commission_tiers')
      app.delete(tiersCol)
    } catch (_) {}
  },
)
