routerAdd(
  'POST',
  '/backend/v1/import-goals',
  (e) => {
    const body = e.requestInfo().body || {}
    const rows = body.rows || []
    const fileName = body.fileName || 'upload.csv'
    const source = body.source || 'CSV'
    const userId = e.auth?.id

    if (!userId) return e.unauthorizedError('Auth required')

    let created = 0
    let updated = 0
    let errorsCount = 0
    let errorDetails = []

    const cache = { users: {}, areas: {}, regionals: {}, districts: {} }

    const findRecord = (txApp, collection, name) => {
      if (!name) return null
      const key = String(name).toLowerCase().trim()
      if (cache[collection][key] !== undefined) return cache[collection][key]

      try {
        let record
        if (collection === 'users') {
          try {
            record = txApp.findFirstRecordByFilter(
              collection,
              'name = {:name} || email = {:name}',
              { name: key },
            )
          } catch (_) {
            const seller = txApp.findFirstRecordByFilter(
              'sellers',
              'name = {:name} || code = {:name}',
              { name: key },
            )
            if (seller.get('user_id')) {
              record = txApp.findRecordById('users', seller.get('user_id'))
            } else {
              throw new Error('User not found')
            }
          }
        } else {
          record = txApp.findFirstRecordByFilter(collection, 'name = {:name}', { name: key })
        }
        cache[collection][key] = record
        return record
      } catch (_) {
        cache[collection][key] = null
        return null
      }
    }

    $app.runInTransaction((txApp) => {
      const goalsCol = txApp.findCollectionByNameOrId('goals')
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const line = i + 2
        try {
          const vendedor = r.vendedor
          const area = r.area
          const regional = r.regional
          const distrito = r.distrito
          const periodo = r.periodo
          const metrica = r.metrica

          if (!vendedor) throw new Error("Coluna 'vendedor' é obrigatória")
          if (!area) throw new Error("Coluna 'area' é obrigatória")
          if (!regional) throw new Error("Coluna 'regional' é obrigatória")
          if (!distrito) throw new Error("Coluna 'distrito' é obrigatória")
          if (!periodo) throw new Error("Coluna 'periodo' é obrigatória")
          if (!metrica) throw new Error("Coluna 'metrica' é obrigatória")

          const user = findRecord(txApp, 'users', vendedor)
          if (!user) throw new Error(`Vendedor não encontrado no sistema: ${vendedor}`)

          const areaRec = findRecord(txApp, 'areas', area)
          if (!areaRec) throw new Error(`Área não encontrada: ${area}`)

          const regionalRec = findRecord(txApp, 'regionals', regional)
          if (!regionalRec) throw new Error(`Regional não encontrada: ${regional}`)

          const distritoRec = findRecord(txApp, 'districts', distrito)
          if (!distritoRec) throw new Error(`Distrito não encontrado: ${distrito}`)

          const seller_id = user.id
          const area_id = areaRec.id
          const regional_id = regionalRec.id

          const pNum = (v) => {
            if (!v) return 0
            const str = String(v).trim()
            if (str.includes('.') && str.includes(',')) {
              return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
            }
            if (str.includes(',')) {
              return parseFloat(str.replace(',', '.')) || 0
            }
            return parseFloat(str) || 0
          }

          const target_base = pNum(r.base)
          const target_bronze = pNum(r.bronze)
          const target_prata = pNum(r.prata)
          const target_ouro = pNum(r.ouro)
          const focus_fleet = pNum(r.frotas)
          const focus_companies = pNum(r.cnpjs)
          const mix_family = String(r.familia || '').trim()

          let existing = null
          try {
            existing = txApp.findFirstRecordByFilter(
              'goals',
              'seller_id = {:seller_id} && period = {:period} && metric = {:metric} && mix_family = {:mix_family}',
              {
                seller_id,
                period: String(periodo).trim(),
                metric: String(metrica).trim(),
                mix_family,
              },
            )
          } catch (_) {}

          if (existing) {
            existing.set('target_base', target_base)
            existing.set('target_bronze', target_bronze)
            existing.set('target_prata', target_prata)
            existing.set('target_ouro', target_ouro)
            existing.set('focus_fleet', focus_fleet)
            existing.set('focus_companies', focus_companies)
            existing.set('regional_id', regional_id)
            existing.set('area_id', area_id)
            txApp.save(existing)
            updated++
          } else {
            const newGoal = new Record(goalsCol)
            newGoal.set('seller_id', seller_id)
            newGoal.set('period', String(periodo).trim())
            newGoal.set('metric', String(metrica).trim())
            newGoal.set('mix_family', mix_family)
            newGoal.set('target_base', target_base)
            newGoal.set('target_bronze', target_bronze)
            newGoal.set('target_prata', target_prata)
            newGoal.set('target_ouro', target_ouro)
            newGoal.set('focus_fleet', focus_fleet)
            newGoal.set('focus_companies', focus_companies)
            newGoal.set('regional_id', regional_id)
            newGoal.set('area_id', area_id)
            txApp.save(newGoal)
            created++
          }
        } catch (err) {
          errorsCount++
          errorDetails.push({ line, error: err.message })
        }
      }
    })

    try {
      const histCol = $app.findCollectionByNameOrId('import_history')
      const histRec = new Record(histCol)
      histRec.set('user_id', userId)
      histRec.set('source', source)
      histRec.set('file_name', fileName)
      histRec.set('stats', { created, updated, errors: errorsCount })
      histRec.set(
        'status',
        errorsCount === 0 ? 'Sucesso' : created + updated > 0 ? 'Parcial' : 'Falha',
      )
      $app.save(histRec)
    } catch (err) {
      $app.logger().error('Failed to save import history', 'error', err.message)
    }

    return e.json(200, {
      created,
      updated,
      errors: errorsCount,
      errorDetails,
    })
  },
  $apis.requireAuth(),
)
