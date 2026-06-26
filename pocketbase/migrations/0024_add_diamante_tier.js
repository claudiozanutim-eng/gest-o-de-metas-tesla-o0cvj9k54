migrate(
  (app) => {
    const tiersCol = app.findCollectionByNameOrId('commission_tiers')

    try {
      const ouro = app.findFirstRecordByData('commission_tiers', 'name', 'Ouro')
      ouro.set('max_pct', 190.99)
      app.save(ouro)
    } catch (_) {}

    try {
      app.findFirstRecordByData('commission_tiers', 'name', 'Meta Diamante')
    } catch (_) {
      const diamante = new Record(tiersCol)
      diamante.set('name', 'Meta Diamante')
      diamante.set('order', 7)
      diamante.set('is_active', true)
      diamante.set('color', '#B9F2FF')
      diamante.set('min_pct', 191)
      diamante.set('max_pct', 500)
      diamante.set('commission_pct', 7)
      diamante.set('multiplier', 0.07)
      app.save(diamante)
    }
  },
  (app) => {
    try {
      const ouro = app.findFirstRecordByData('commission_tiers', 'name', 'Ouro')
      ouro.set('max_pct', 999.99)
      app.save(ouro)
    } catch (_) {}

    try {
      const diamante = app.findFirstRecordByData('commission_tiers', 'name', 'Meta Diamante')
      app.delete(diamante)
    } catch (_) {}
  },
)
