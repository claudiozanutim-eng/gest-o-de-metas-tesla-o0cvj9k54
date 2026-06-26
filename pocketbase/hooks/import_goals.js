routerAdd(
  'POST',
  '/backend/v1/import-goals',
  (e) => {
    const body = e.requestInfo().body || {}
    const rows = body.rows || []

    if (!rows || rows.length === 0) {
      return e.badRequestError('Nenhuma linha enviada para importação.')
    }

    let totalUpserts = 0

    try {
      $app.runInTransaction((txApp) => {
        const goalsCol = txApp.findCollectionByNameOrId('goals')

        for (const row of rows) {
          // Record 1: Faturamento
          let rec1 = null
          try {
            rec1 = txApp.findFirstRecordByFilter(
              'goals',
              'seller_id = {:seller_id} && period = {:period} && metric = {:metric}',
              { seller_id: row.seller_id, period: row.period, metric: row.metrica1 },
            )
          } catch (_) {}

          if (!rec1) {
            rec1 = new Record(goalsCol)
            rec1.set('seller_id', row.seller_id)
            rec1.set('period', row.period)
            rec1.set('metric', row.metrica1)
            rec1.set('regional_id', row.regional_id)
            rec1.set('area_id', row.area_id)
          }
          rec1.set('target_base', row.base1)
          rec1.set('target_bronze', row.bronze1)
          rec1.set('target_prata', row.prata1)
          rec1.set('target_ouro', row.ouro1)
          txApp.save(rec1)
          totalUpserts++

          // Record 2: Família
          let rec2 = null
          try {
            rec2 = txApp.findFirstRecordByFilter(
              'goals',
              'seller_id = {:seller_id} && period = {:period} && metric = {:metric} && mix_family = {:mix_family}',
              {
                seller_id: row.seller_id,
                period: row.period,
                metric: row.metrica2,
                mix_family: row.familia,
              },
            )
          } catch (_) {}

          if (!rec2) {
            rec2 = new Record(goalsCol)
            rec2.set('seller_id', row.seller_id)
            rec2.set('period', row.period)
            rec2.set('metric', row.metrica2)
            rec2.set('mix_family', row.familia)
            rec2.set('regional_id', row.regional_id)
            rec2.set('area_id', row.area_id)
          }
          rec2.set('target_base', row.base2)
          rec2.set('target_bronze', row.bronze2)
          rec2.set('target_prata', row.prata2)
          rec2.set('target_ouro', row.ouro2)
          rec2.set('focus_fleet', row.frotas)
          rec2.set('focus_companies', row.cnpjs)
          txApp.save(rec2)
          totalUpserts++
        }
      })

      try {
        const histCol = $app.findCollectionByNameOrId('import_history')
        const histRec = new Record(histCol)
        histRec.set('user_id', e.auth?.id)
        histRec.set('source', body.source || 'Batch Import (18 Colunas)')
        histRec.set('file_name', body.fileName || 'import.csv')
        histRec.set('status', 'success')
        histRec.set('stats', JSON.stringify({ upserted: totalUpserts }))
        $app.save(histRec)
      } catch (_) {}

      return e.json(200, { created: totalUpserts, updated: 0 })
    } catch (err) {
      return e.badRequestError('Erro na importação transacional: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
