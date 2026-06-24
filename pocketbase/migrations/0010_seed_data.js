migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Admin user
    try {
      app.findAuthRecordByEmail('users', 'claudio.zanutim@iceduc.com.br')
    } catch (_) {
      const admin = new Record(users)
      admin.setEmail('claudio.zanutim@iceduc.com.br')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Claudio Zanutim')
      admin.set('role', 'Administrator')
      app.save(admin)
    }

    // System parameters
    try {
      app.findFirstRecordByData('system_parameters', 'key', 'commission_rules')
    } catch (_) {
      const params = app.findCollectionByNameOrId('system_parameters')
      const record = new Record(params)
      record.set('key', 'commission_rules')
      record.set('value', {
        base_threshold: 80,
        base_multiplier: 0,
        bronze_threshold: 95,
        bronze_multiplier: 0.02,
        prata_threshold: 110,
        prata_multiplier: 0.035,
        ouro_multiplier: 0.05,
      })
      record.set('description', 'Regras de comissionamento')
      app.save(record)
    }

    // product families
    const families = [
      { code: 'F1', name: 'F1 - Automação' },
      { code: 'F2', name: 'F2 - Robótica' },
      { code: 'F3', name: 'F3 - Sensores' },
      { code: 'OUTROS', name: 'Outros' },
    ]
    for (const f of families) {
      try {
        app.findFirstRecordByData('product_families', 'code', f.code)
      } catch (_) {
        const col = app.findCollectionByNameOrId('product_families')
        const rec = new Record(col)
        rec.set('code', f.code)
        rec.set('name', f.name)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      const admin = app.findAuthRecordByEmail('users', 'claudio.zanutim@iceduc.com.br')
      app.delete(admin)
    } catch (_) {}

    try {
      const p = app.findFirstRecordByData('system_parameters', 'key', 'commission_rules')
      app.delete(p)
    } catch (_) {}
  },
)
