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

    const cleanStr = (val) => {
      if (val == null) return ''
      let s = String(val).trim().toLowerCase().replace(/\s+/g, ' ')
      if (s.match(/^-?[0-9]+\.0$/)) {
        s = s.substring(0, s.length - 2)
      }
      if (s.match(/^[0-9]+$/)) {
        s = parseInt(s, 10).toString()
      }
      return s
    }

    const normalizeHierarchyName = (val, type) => {
      let s = cleanStr(val)
      if (type === 'regional') {
        s = s.replace(/^regional\s+/, '')
      } else if (type === 'distrito') {
        s = s.replace(/^distrito\s+/, '')
      } else if (type === 'area' || type === 'área') {
        s = s.replace(/^área\s+/, '').replace(/^area\s+/, '')
      }
      return s
    }

    let transactionFailed = false
    try {
      $app.runInTransaction((txApp) => {
        const goalsCol = txApp.findCollectionByNameOrId('goals')
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]
          const line = r.rowNum || i + 2
          try {
            const vendedor = r.vendedor
            const area = r.area
            const regional = r.regional
            const distrito = r.distrito
            const periodo = r.periodo
            const metrica1 = r.metrica1
            const metrica2 = r.metrica2

            if (!vendedor) throw new Error("Coluna 'vendedor' é obrigatória")
            if (!area) throw new Error("Coluna 'area' é obrigatória")
            if (!regional) throw new Error("Coluna 'regional' é obrigatória")
            if (!distrito) throw new Error("Coluna 'distrito' é obrigatória")
            if (!periodo) throw new Error("Coluna 'periodo' é obrigatória")
            if (!metrica1) throw new Error("Coluna 'Métrica' (1) é obrigatória")
            if (!metrica2) throw new Error("Coluna 'Métrica' (2) é obrigatória")

            // Find District
            const distNameRaw = cleanStr(distrito)
            const distNameNorm = normalizeHierarchyName(distrito, 'distrito')
            const districts = loadCollection(txApp, 'districts')
            const distritoRec = districts.find((d) => {
              const dbName = cleanStr(d.getString('name'))
              const dbNorm = normalizeHierarchyName(d.getString('name'), 'distrito')
              return dbName === distNameRaw || dbNorm === distNameNorm
            })
            if (!distritoRec) throw new Error(`Distrito "${distrito}" não encontrado no sistema.`)

            // Find Regional
            const regNameRaw = cleanStr(regional)
            const regNameNorm = normalizeHierarchyName(regional, 'regional')
            const regionals = loadCollection(txApp, 'regionals')
            const regionalRec = regionals.find((rg) => {
              const dbName = cleanStr(rg.getString('name'))
              const dbNorm = normalizeHierarchyName(rg.getString('name'), 'regional')
              const matchName = dbName === regNameRaw || dbNorm === regNameNorm
              return matchName && rg.getString('district_id') === distritoRec.id
            })
            if (!regionalRec)
              throw new Error(
                `Regional "${regional}" não encontrada associada ao distrito "${distrito}".`,
              )

            // Find Area
            const areaNameRaw = cleanStr(area)
            const areaNameNorm = normalizeHierarchyName(area, 'area')
            const areas = loadCollection(txApp, 'areas')
            const areaRec = areas.find((a) => {
              const dbName = cleanStr(a.getString('name'))
              const dbNorm = normalizeHierarchyName(a.getString('name'), 'area')
              const matchName = dbName === areaNameRaw || dbNorm === areaNameNorm
              return matchName && a.getString('regional_id') === regionalRec.id
            })
            if (!areaRec)
              throw new Error(`Área "${area}" não encontrada associada à regional "${regional}".`)

            // Find Seller and User
            const sellerNameOrCode = cleanStr(vendedor)
            const sellers = loadCollection(txApp, 'sellers')
            const sellerRec = sellers.find(
              (s) =>
                (cleanStr(s.getString('name')) === sellerNameOrCode ||
                  cleanStr(s.getString('code')) === sellerNameOrCode) &&
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
                  (cleanStr(u.getString('name')) === sellerNameOrCode ||
                    cleanStr(u.getString('email')) === sellerNameOrCode) &&
                  u.getString('area_id') === areaRec.id,
              )
            }

            if (!userRec) {
              throw new Error(
                `Vendedor "${vendedor}" não encontrado (Verifique a Área: "${area}", Regional: "${regional}", Distrito: "${distrito}").`,
              )
            }

            if (sellerRec && !sellerRec.getString('user_id')) {
              sellerRec.set('user_id', userRec.id)
              txApp.save(sellerRec)
            }

            const seller_id = userRec.id
            const area_id = areaRec.id
            const regional_id = regionalRec.id

            const pNum = (v) => {
              if (v === null || v === undefined || v === '') return 0
              const str = String(v).trim()
              if (str.includes('.') && str.includes(',')) {
                const parsed = parseFloat(str.replace(/\./g, '').replace(',', '.'))
                return isNaN(parsed) ? 0 : parsed
              }
              if (str.includes(',')) {
                const parsed = parseFloat(str.replace(',', '.'))
                return isNaN(parsed) ? 0 : parsed
              }
              const parsed = parseFloat(str)
              return isNaN(parsed) ? 0 : parsed
            }

            const focus_fleet = pNum(r.frotas)
            const focus_companies = pNum(r.cnpjs)
            const mix_family = String(r.familia || '').trim()

            const metricsToProcess = [
              {
                metrica: metrica1,
                base: r.base1,
                bronze: r.bronze1,
                prata: r.prata1,
                ouro: r.ouro1,
              },
              {
                metrica: metrica2,
                base: r.base2,
                bronze: r.bronze2,
                prata: r.prata2,
                ouro: r.ouro2,
              },
            ]

            for (const m of metricsToProcess) {
              if (!m.metrica) continue

              const target_base = pNum(m.base)
              const target_bronze = pNum(m.bronze)
              const target_prata = pNum(m.prata)
              const target_ouro = pNum(m.ouro)

              let existing = null
              try {
                existing = txApp.findFirstRecordByFilter(
                  'goals',
                  'seller_id = {:seller_id} && period = {:period} && metric = {:metric} && mix_family = {:mix_family}',
                  {
                    seller_id,
                    period: String(periodo).trim(),
                    metric: String(m.metrica).trim(),
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
                newGoal.set('metric', String(m.metrica).trim())
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
            }
          } catch (err) {
            errorsCount++
            errorDetails.push({ line, error: err.message })
          }
        }

        if (errorsCount > 0) {
          throw new Error('ROLLBACK_BATCH')
        }
      })
    } catch (err) {
      if (err.message === 'ROLLBACK_BATCH') {
        transactionFailed = true
      } else {
        throw err
      }
    }

    try {
      const histCol = $app.findCollectionByNameOrId('import_history')
      const histRec = new Record(histCol)
      histRec.set('user_id', userId)
      histRec.set('source', source)
      histRec.set('file_name', fileName)
      histRec.set('stats', {
        created: transactionFailed ? 0 : created,
        updated: transactionFailed ? 0 : updated,
        errors: errorsCount,
      })
      histRec.set('status', transactionFailed ? 'Falha' : 'Sucesso')
      $app.save(histRec)
    } catch (err) {
      $app.logger().error('Failed to save import history', 'error', err.message)
    }

    return e.json(200, {
      created: transactionFailed ? 0 : created,
      updated: transactionFailed ? 0 : updated,
      errors: errorsCount,
      errorDetails,
    })
  },
  $apis.requireAuth(),
)
