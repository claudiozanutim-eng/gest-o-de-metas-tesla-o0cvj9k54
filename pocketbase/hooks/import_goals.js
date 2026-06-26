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

    const collectionsCache = {
      users: null,
      areas: null,
      regionals: null,
      districts: null,
      sellers: null,
    }

    const loadCollection = (txApp, colName) => {
      if (!collectionsCache[colName]) {
        collectionsCache[colName] = txApp.findRecordsByFilter(colName, '1=1', '', 10000, 0)
      }
      return collectionsCache[colName]
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

          // Find District
          const distName = String(distrito).trim().toLowerCase()
          const districts = loadCollection(txApp, 'districts')
          const distritoRec = districts.find(
            (d) => d.getString('name').trim().toLowerCase() === distName,
          )
          if (!distritoRec) throw new Error(`Distrito não encontrado: ${distrito}`)

          // Find Regional
          const regName = String(regional).trim().toLowerCase()
          const regionals = loadCollection(txApp, 'regionals')
          const regionalRec = regionals.find(
            (rg) =>
              rg.getString('name').trim().toLowerCase() === regName &&
              rg.getString('district_id') === distritoRec.id,
          )
          if (!regionalRec)
            throw new Error(`Regional não encontrada no distrito '${distrito}': ${regional}`)

          // Find Area
          const areaName = String(area).trim().toLowerCase()
          const areas = loadCollection(txApp, 'areas')
          const areaRec = areas.find(
            (a) =>
              a.getString('name').trim().toLowerCase() === areaName &&
              a.getString('regional_id') === regionalRec.id,
          )
          if (!areaRec) throw new Error(`Área não encontrada na regional '${regional}': ${area}`)

          // Find Seller and User
          const sellerNameOrCode = String(vendedor).trim().toLowerCase()
          const sellers = loadCollection(txApp, 'sellers')
          const sellerRec = sellers.find(
            (s) =>
              (s.getString('name').trim().toLowerCase() === sellerNameOrCode ||
                s.getString('code').trim().toLowerCase() === sellerNameOrCode) &&
              s.getString('area_id') === areaRec.id,
          )

          let userRec = null
          if (sellerRec && sellerRec.getString('user_id')) {
            try {
              userRec = txApp.findRecordById('users', sellerRec.getString('user_id'))
            } catch (_) {}
          }

          if (!userRec) {
            // Search in users directly as fallback
            const users = loadCollection(txApp, 'users')
            userRec = users.find(
              (u) =>
                (u.getString('name').trim().toLowerCase() === sellerNameOrCode ||
                  u.getString('email').trim().toLowerCase() === sellerNameOrCode) &&
                u.getString('area_id') === areaRec.id,
            )
          }

          if (!userRec) {
            throw new Error(
              `Vendedor não encontrado na hierarquia (Área: ${area}, Regional: ${regional}, Distrito: ${distrito}): ${vendedor}`,
            )
          }

          const seller_id = userRec.id
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
