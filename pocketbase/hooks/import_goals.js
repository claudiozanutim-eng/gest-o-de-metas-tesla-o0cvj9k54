routerAdd(
  'POST',
  '/backend/v1/import-goals',
  (e) => {
    const body = e.requestInfo().body
    const rows = body.rows || []
    let created = 0
    let updated = 0
    let errors = 0
    const errorDetails = []

    function parseNum(val) {
      if (!val || val === '') return 0
      let s = String(val).replace(/R\$/gi, '').replace(/\s/g, '')
      if (s === '') return 0
      if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g, '').replace(',', '.')
      else if (s.indexOf(',') > -1) s = s.replace(',', '.')
      const n = parseFloat(s)
      return isNaN(n) ? 0 : n
    }

    function norm(val) {
      if (!val) return ''
      return String(val)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
    }

    const users = $app.findRecordsByFilter('users', '1=1', '', 10000, 0)
    const sellers = $app.findRecordsByFilter('sellers', '1=1', '', 10000, 0)
    const regionals = $app.findRecordsByFilter('regionals', '1=1', '', 10000, 0)
    const areas = $app.findRecordsByFilter('areas', '1=1', '', 10000, 0)

    const userMap = {}
    for (const u of users) {
      const n = norm(u.getString('name'))
      if (n) userMap[n] = u.id
    }
    const sellerMap = {}
    const sellerByCode = {}
    for (const s of sellers) {
      const n = norm(s.getString('name'))
      if (n) sellerMap[n] = s
      const c = norm(s.getString('code'))
      if (c) sellerByCode[c] = s
    }
    const regionalMap = {}
    for (const r of regionals) {
      const n = norm(r.getString('name'))
      if (n) regionalMap[n] = r.id
    }
    const areaMap = {}
    for (const a of areas) {
      const n = norm(a.getString('name'))
      if (n) areaMap[n] = a
    }

    function findUserId(name) {
      if (!name) return ''
      const n = norm(name)
      if (userMap[n]) return userMap[n]
      if (sellerMap[n] && sellerMap[n].getString('user_id'))
        return sellerMap[n].getString('user_id')
      if (sellerByCode[n] && sellerByCode[n].getString('user_id'))
        return sellerByCode[n].getString('user_id')
      for (const k in userMap) {
        if (k.indexOf(n) > -1 || n.indexOf(k) > -1) return userMap[k]
      }
      for (const k in sellerMap) {
        if ((k.indexOf(n) > -1 || n.indexOf(k) > -1) && sellerMap[k].getString('user_id'))
          return sellerMap[k].getString('user_id')
      }
      return ''
    }

    function findRegionalId(name) {
      if (!name) return ''
      const n = norm(name)
      if (regionalMap[n]) return regionalMap[n]
      for (const k in regionalMap) {
        if (k.indexOf(n) > -1 || n.indexOf(k) > -1) return regionalMap[k]
      }
      return ''
    }

    function findAreaId(name) {
      if (!name) return ''
      const n = norm(name)
      if (areaMap[n]) return areaMap[n].id
      for (const k in areaMap) {
        if (k.indexOf(n) > -1 || n.indexOf(k) > -1) return areaMap[k].id
      }
      return ''
    }

    function getDefaultPeriod() {
      const d = new Date()
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
    }

    $app.runInTransaction((txApp) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const lineNum = i + 2
        try {
          const vendedor = (row.vendedor || '').trim()
          const periodo = (row.periodo || '').trim() || getDefaultPeriod()
          const familia = (row.familia || '').trim()
          const base = parseNum(row.meta_base)
          const bronze = parseNum(row.meta_bronze)
          const prata = parseNum(row.meta_prata)
          const ouro = parseNum(row.meta_ouro)
          const frota = parseNum(row.frota)
          const cnpjs = parseNum(row.cnpjs)
          const covD = parseNum(row.cobertura_diaria)
          const covW = parseNum(row.cobertura_semanal)
          const covM = parseNum(row.cobertura_mensal)

          const sellerId = findUserId(vendedor)
          if (!sellerId) {
            errors++
            errorDetails.push({
              line: lineNum,
              error: 'Vendedor "' + vendedor + '" nao encontrado',
            })
            continue
          }

          let regionalId = findRegionalId((row.regional || '').trim())
          if (!regionalId) {
            const u = users.find((x) => x.id === sellerId)
            if (u && u.getString('regional_id')) regionalId = u.getString('regional_id')
          }
          if (!regionalId) {
            errors++
            errorDetails.push({
              line: lineNum,
              error: 'Regional nao encontrada para o vendedor "' + vendedor + '"',
            })
            continue
          }

          let areaId = findAreaId((row.area || '').trim())
          if (!areaId) {
            const u = users.find((x) => x.id === sellerId)
            if (u && u.getString('area_id')) areaId = u.getString('area_id')
          }

          let metric = (row.metrica || '').trim()
          if (!metric) {
            if (covD > 0 || covW > 0 || covM > 0) metric = 'Coverage'
            else if (familia) metric = 'Mix'
            else metric = 'Faturamento'
          } else {
            const ml = metric.toLowerCase()
            if (ml.indexOf('fatur') > -1) metric = 'Faturamento'
            else if (ml.indexOf('mix') > -1) metric = 'Mix'
            else if (ml.indexOf('cobert') > -1 || ml.indexOf('coverage') > -1) metric = 'Coverage'
          }

          let goal = null
          try {
            goal = txApp.findFirstRecordByFilter(
              'goals',
              'seller_id={:s} && period={:p} && metric={:m} && area_id={:a} && regional_id={:r} && mix_family={:f}',
              {
                s: sellerId,
                p: periodo,
                m: metric,
                a: areaId || '',
                r: regionalId || '',
                f: familia || '',
              },
            )
          } catch (_) {}

          const isCov = metric.toLowerCase().indexOf('cov') > -1

          if (goal) {
            goal.set('target_base', isCov && covM > 0 ? covM : base)
            goal.set('target_bronze', bronze)
            goal.set('target_prata', prata)
            goal.set('target_ouro', ouro)
            goal.set('focus_fleet', frota)
            goal.set('focus_companies', cnpjs)
            if (covD > 0) goal.set('target_daily_coverage', covD)
            if (covW > 0) goal.set('target_weekly_coverage', covW)
            if (covM > 0) goal.set('target_monthly_coverage', covM)
            txApp.save(goal)
            updated++
          } else {
            const col = txApp.findCollectionByNameOrId('goals')
            const g = new Record(col)
            g.set('seller_id', sellerId)
            g.set('period', periodo)
            g.set('metric', metric)
            g.set('area_id', areaId || '')
            g.set('regional_id', regionalId || '')
            g.set('mix_family', familia || '')
            g.set('target_base', isCov && covM > 0 ? covM : base)
            g.set('target_bronze', bronze)
            g.set('target_prata', prata)
            g.set('target_ouro', ouro)
            g.set('focus_fleet', frota)
            g.set('focus_companies', cnpjs)
            if (covD > 0) g.set('target_daily_coverage', covD)
            if (covW > 0) g.set('target_weekly_coverage', covW)
            if (covM > 0) g.set('target_monthly_coverage', covM)
            txApp.save(g)
            created++
          }
        } catch (err) {
          errors++
          errorDetails.push({ line: lineNum, error: err.message })
        }
      }
    })

    if (!body.skipHistory) {
      try {
        const hc = $app.findCollectionByNameOrId('import_history')
        const hr = new Record(hc)
        hr.set('user_id', body.userId || (e.auth ? e.auth.id : ''))
        hr.set('source', body.source || 'Manual API')
        hr.set('file_name', body.fileName || 'unknown')
        hr.set('stats', {
          created: created,
          updated: updated,
          errors: errors,
          errorDetails: errorDetails.slice(0, 100),
        })
        let st = 'Sucesso'
        if (errors > 0 && created === 0 && updated === 0) st = 'Falha'
        else if (errors > 0) st = 'Parcial'
        hr.set('status', st)
        $app.save(hr)
      } catch (_) {}
    }

    return e.json(200, {
      created: created,
      updated: updated,
      errors: errors,
      errorDetails: errorDetails,
    })
  },
  $apis.requireAuth(),
)
