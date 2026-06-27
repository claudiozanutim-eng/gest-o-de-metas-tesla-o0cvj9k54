routerAdd(
  'POST',
  '/backend/v1/import-goals',
  (e) => {
    const body = e.requestInfo().body
    const rows = body.rows || []
    let created = 0
    let updated = 0

    $app.runInTransaction((txApp) => {
      for (const row of rows) {
        try {
          let goal
          try {
            goal = txApp.findFirstRecordByFilter(
              'goals',
              'seller_id={:seller} && period={:period} && metric={:metric} && area_id={:area} && regional_id={:regional} && mix_family={:mix}',
              {
                seller: row.seller_id,
                period: row.period,
                metric: row.metric,
                area: row.area_id,
                regional: row.regional_id,
                mix: row.familia || '',
              },
            )
          } catch (_) {}

          const isCoverage =
            row.metric === 'Coverage' || String(row.metric).toLowerCase().includes('cobertura')

          if (goal) {
            goal.set('target_base', row.base)
            goal.set('target_bronze', row.bronze)
            goal.set('target_prata', row.prata)
            goal.set('target_ouro', row.ouro)
            goal.set('focus_fleet', row.frotas || 0)
            goal.set('focus_companies', row.cnpjs || 0)
            if (isCoverage) {
              goal.set('target_monthly_coverage', row.base)
            }
            txApp.save(goal)
            updated++
          } else {
            const col = txApp.findCollectionByNameOrId('goals')
            const newGoal = new Record(col)
            newGoal.set('seller_id', row.seller_id)
            newGoal.set('period', row.period)
            newGoal.set('metric', row.metric)
            newGoal.set('area_id', row.area_id)
            newGoal.set('regional_id', row.regional_id)
            newGoal.set('mix_family', row.familia || '')
            newGoal.set('target_base', row.base)
            newGoal.set('target_bronze', row.bronze)
            newGoal.set('target_prata', row.prata)
            newGoal.set('target_ouro', row.ouro)
            newGoal.set('focus_fleet', row.frotas || 0)
            newGoal.set('focus_companies', row.cnpjs || 0)
            if (isCoverage) {
              newGoal.set('target_monthly_coverage', row.base)
            }
            txApp.save(newGoal)
            created++
          }
        } catch (err) {
          $app.logger().error('import error', 'row', JSON.stringify(row), 'err', err.message)
        }
      }
    })

    try {
      const histCol = $app.findCollectionByNameOrId('import_history')
      const histRecord = new Record(histCol)
      histRecord.set('user_id', e.auth?.id)
      histRecord.set('source', body.source || 'Manual API')
      histRecord.set('file_name', body.fileName || 'unknown')
      histRecord.set('stats', { created, updated })
      histRecord.set('status', 'success')
      $app.save(histRecord)
    } catch (err) {}

    return e.json(200, { created, updated })
  },
  $apis.requireAuth(),
)
