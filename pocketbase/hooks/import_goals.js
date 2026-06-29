routerAdd(
  'POST',
  '/backend/v1/import-goals',
  (e) => {
    const body = e.requestInfo().body
    const rows = body.rows || []

    var authRole = e.auth ? e.auth.getString('role') : ''
    if (authRole === 'Vendedor') {
      return e.json(403, {
        success: false,
        errors: [
          {
            line: 0,
            field: 'permission',
            value: authRole,
            message: 'Acesso negado. Vendedores não podem importar metas.',
          },
        ],
        created: 0,
        faturamentoCount: 0,
        coberturaCount: 0,
        totalRows: 0,
      })
    }

    if (!rows || rows.length === 0) {
      return e.json(400, {
        success: false,
        errors: [
          { line: 0, field: 'rows', value: '', message: 'Nenhuma linha encontrada no arquivo' },
        ],
        created: 0,
        faturamentoCount: 0,
        coberturaCount: 0,
        totalRows: 0,
      })
    }

    function parseNum(val) {
      if (!val || val === '') return 0
      var s = String(val).replace(/R\$/gi, '').replace(/%/g, '').replace(/\s/g, '')
      if (s === '') return 0
      if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g, '').replace(',', '.')
      else if (s.indexOf(',') > -1) s = s.replace(',', '.')
      var n = parseFloat(s)
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

    function normPeriod(p) {
      if (!p) return ''
      p = String(p).trim()
      if (/^\d{4}-\d{2}$/.test(p)) return p
      var m = p.match(/^(\d{1,2})\/(\d{4})$/)
      if (m) return m[2] + '-' + m[1].padStart(2, '0')
      var parts = p.split('/')
      if (parts.length === 2) return parts[1] + '-' + parts[0].padStart(2, '0')
      return p
    }

    var districts = $app.findRecordsByFilter('districts', '1=1', '', 10000, 0)
    var regionals = $app.findRecordsByFilter('regionals', '1=1', '', 10000, 0)
    var areas = $app.findRecordsByFilter('areas', '1=1', '', 10000, 0)
    var sellers = $app.findRecordsByFilter('sellers', '1=1', '', 10000, 0)
    var users = $app.findRecordsByFilter('users', '1=1', '', 10000, 0)
    var productFamilies = $app.findRecordsByFilter('product_families', '1=1', '', 10000, 0)

    var dMap = {},
      rMap = {},
      aMap = {},
      sMap = {},
      sCodeMap = {},
      uMap = {}
    for (var d of districts) {
      var dn = norm(d.getString('name'))
      if (dn) dMap[dn] = d
    }
    for (var r of regionals) {
      var rn = norm(r.getString('name'))
      if (rn) rMap[rn] = r
    }
    for (var a of areas) {
      var an = norm(a.getString('name'))
      if (an) aMap[an] = a
    }
    for (var s of sellers) {
      var sn = norm(s.getString('name'))
      if (sn) sMap[sn] = s
      var sc = norm(s.getString('code'))
      if (sc) sCodeMap[sc] = s
    }
    for (var u of users) {
      var un = norm(u.getString('name'))
      if (un) uMap[un] = u.id
    }

    var validFamilyCodes = {}
    for (var pf of productFamilies) {
      var fcode = pf.getString('code')
      if (fcode) validFamilyCodes[fcode.toUpperCase()] = true
    }
    if (Object.keys(validFamilyCodes).length === 0) {
      validFamilyCodes = { F1: true, F2: true, F3: true, F4: true, F5: true, OUTROS: true }
    }

    var valid = [],
      errs = []

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      var lineNum = i + 2

      var vendedor = (row.vendedor || '').trim()
      var distritoName = (row.distrito || '').trim()
      var regionalName = (row.regional || '').trim()
      var areaName = (row.area || '').trim()
      var familia = (row.familia || row.mix_family || '').trim().toUpperCase()
      var periodoRaw = (row.periodo || '').trim()
      var metaBase = parseNum(row.meta_base || row.base)
      var metaBronze = parseNum(row.meta_bronze || row.bronze)
      var metaPrata = parseNum(row.meta_prata || row.prata)
      var metaOuro = parseNum(row.meta_ouro || row.ouro)
      var cobertura = parseNum(row.cobertura || row.cobertura_mensal)
      var frota = parseNum(row.frota || row.frota_foco)
      var cnpjs = parseNum(row.cnpjs || row.empresa_foco)

      if (!periodoRaw) {
        errs.push({ line: lineNum, field: 'periodo', value: '', message: 'Período é obrigatório' })
        continue
      }
      var periodo = normPeriod(periodoRaw)
      if (!/^\d{4}-\d{2}$/.test(periodo)) {
        errs.push({
          line: lineNum,
          field: 'periodo',
          value: periodoRaw,
          message: 'Período deve estar no formato MM/AAAA',
        })
        continue
      }

      if (!distritoName) {
        errs.push({
          line: lineNum,
          field: 'distrito',
          value: '',
          message: 'Distrito é obrigatório',
        })
        continue
      }
      var district = dMap[norm(distritoName)] || null
      if (!district) {
        errs.push({
          line: lineNum,
          field: 'distrito',
          value: distritoName,
          message: 'Distrito "' + distritoName + '" não encontrado',
        })
        continue
      }

      if (!regionalName) {
        errs.push({
          line: lineNum,
          field: 'regional',
          value: '',
          message: 'Regional é obrigatória',
        })
        continue
      }
      var regional = rMap[norm(regionalName)] || null
      if (!regional) {
        errs.push({
          line: lineNum,
          field: 'regional',
          value: regionalName,
          message: 'Regional "' + regionalName + '" não encontrada',
        })
        continue
      }
      if (regional.getString('district_id') !== district.id) {
        errs.push({
          line: lineNum,
          field: 'regional',
          value: regionalName,
          message:
            'Regional "' + regionalName + '" não pertence ao Distrito "' + distritoName + '"',
        })
        continue
      }

      if (!areaName) {
        errs.push({ line: lineNum, field: 'area', value: '', message: 'Área é obrigatória' })
        continue
      }
      var area = aMap[norm(areaName)] || null
      if (!area) {
        errs.push({
          line: lineNum,
          field: 'area',
          value: areaName,
          message: 'Área "' + areaName + '" não encontrada',
        })
        continue
      }
      if (area.getString('regional_id') !== regional.id) {
        errs.push({
          line: lineNum,
          field: 'area',
          value: areaName,
          message: 'Área "' + areaName + '" não pertence à Regional "' + regionalName + '"',
        })
        continue
      }

      if (!vendedor) {
        errs.push({
          line: lineNum,
          field: 'vendedor',
          value: '',
          message: 'Vendedor é obrigatório',
        })
        continue
      }
      var sellerId = ''
      var vn = norm(vendedor)
      if (uMap[vn]) sellerId = uMap[vn]
      else if (sMap[vn] && sMap[vn].getString('user_id')) sellerId = sMap[vn].getString('user_id')
      else if (sCodeMap[vn] && sCodeMap[vn].getString('user_id'))
        sellerId = sCodeMap[vn].getString('user_id')
      if (!sellerId) {
        for (var k in uMap) {
          if (k.indexOf(vn) > -1 || vn.indexOf(k) > -1) {
            sellerId = uMap[k]
            break
          }
        }
      }
      if (!sellerId) {
        errs.push({
          line: lineNum,
          field: 'vendedor',
          value: vendedor,
          message: 'Vendedor "' + vendedor + '" não encontrado',
        })
        continue
      }

      if (familia && !validFamilyCodes[familia]) {
        errs.push({
          line: lineNum,
          field: 'familia',
          value: familia,
          message: 'Família "' + familia + '" não encontrada no cadastro de famílias de produtos',
        })
        continue
      }

      if (metaBase <= 0) {
        errs.push({
          line: lineNum,
          field: 'meta_base',
          value: String(row.meta_base || row.base || ''),
          message: 'Meta Base deve ser maior que zero',
        })
        continue
      }
      if (metaBronze > 0 && metaPrata > 0 && metaBronze >= metaPrata) {
        errs.push({
          line: lineNum,
          field: 'meta_bronze',
          value: String(metaBronze),
          message: 'Meta Bronze deve ser menor que Meta Prata',
        })
        continue
      }
      if (metaPrata > 0 && metaOuro > 0 && metaPrata >= metaOuro) {
        errs.push({
          line: lineNum,
          field: 'meta_prata',
          value: String(metaPrata),
          message: 'Meta Prata deve ser menor que Meta Ouro',
        })
        continue
      }
      if (metaBronze > 0 && metaOuro > 0 && metaBronze >= metaOuro) {
        errs.push({
          line: lineNum,
          field: 'meta_bronze',
          value: String(metaBronze),
          message: 'Meta Bronze deve ser menor que Meta Ouro',
        })
        continue
      }

      if (cobertura < 0 || cobertura > 100) {
        errs.push({
          line: lineNum,
          field: 'cobertura',
          value: String(cobertura),
          message: 'Cobertura deve estar entre 0 e 100',
        })
        continue
      }

      valid.push({
        sellerId: sellerId,
        periodo: periodo,
        familia: familia,
        districtId: district.id,
        regionalId: regional.id,
        areaId: area.id,
        metaBase: metaBase,
        metaBronze: metaBronze,
        metaPrata: metaPrata,
        metaOuro: metaOuro,
        cobertura: cobertura,
        frota: frota,
        cnpjs: cnpjs,
      })
    }

    if (errs.length > 0) {
      return e.json(400, {
        success: false,
        errors: errs,
        created: 0,
        faturamentoCount: 0,
        coberturaCount: 0,
        totalRows: rows.length,
      })
    }

    var fatCount = 0,
      covCount = 0

    try {
      $app.runInTransaction(function (txApp) {
        var col = txApp.findCollectionByNameOrId('goals')

        for (var v of valid) {
          var fatGoal = null
          try {
            fatGoal = txApp.findFirstRecordByFilter(
              'goals',
              'seller_id={:s} && period={:p} && metric="Faturamento" && area_id={:a} && regional_id={:r} && mix_family={:f}',
              { s: v.sellerId, p: v.periodo, a: v.areaId, r: v.regionalId, f: v.familia },
            )
          } catch (_) {}

          if (fatGoal) {
            fatGoal.set('district_id', v.districtId)
            fatGoal.set('target_base', v.metaBase)
            fatGoal.set('target_bronze', v.metaBronze)
            fatGoal.set('target_prata', v.metaPrata)
            fatGoal.set('target_ouro', v.metaOuro)
            fatGoal.set('focus_fleet', v.frota)
            fatGoal.set('focus_companies', v.cnpjs)
            txApp.save(fatGoal)
          } else {
            var g1 = new Record(col)
            g1.set('seller_id', v.sellerId)
            g1.set('period', v.periodo)
            g1.set('metric', 'Faturamento')
            g1.set('district_id', v.districtId)
            g1.set('area_id', v.areaId)
            g1.set('regional_id', v.regionalId)
            g1.set('mix_family', v.familia)
            g1.set('target_base', v.metaBase)
            g1.set('target_bronze', v.metaBronze)
            g1.set('target_prata', v.metaPrata)
            g1.set('target_ouro', v.metaOuro)
            g1.set('focus_fleet', v.frota)
            g1.set('focus_companies', v.cnpjs)
            txApp.save(g1)
          }
          fatCount++

          var covBase = v.cobertura,
            covBronze = v.cobertura * 0.8,
            covPrata = v.cobertura * 0.9,
            covOuro = v.cobertura
          var covGoal = null
          try {
            covGoal = txApp.findFirstRecordByFilter(
              'goals',
              'seller_id={:s} && period={:p} && metric="Cobertura" && area_id={:a} && regional_id={:r} && mix_family=""',
              { s: v.sellerId, p: v.periodo, a: v.areaId, r: v.regionalId },
            )
          } catch (_) {}

          if (covGoal) {
            covGoal.set('district_id', v.districtId)
            covGoal.set('target_base', covBase)
            covGoal.set('target_bronze', covBronze)
            covGoal.set('target_prata', covPrata)
            covGoal.set('target_ouro', covOuro)
            covGoal.set('target_monthly_coverage', covBase)
            covGoal.set('target_daily_coverage', covBase > 0 ? covBase / 30 : 0)
            covGoal.set('target_weekly_coverage', covBase > 0 ? covBase / 4 : 0)
            txApp.save(covGoal)
          } else {
            var g2 = new Record(col)
            g2.set('seller_id', v.sellerId)
            g2.set('period', v.periodo)
            g2.set('metric', 'Cobertura')
            g2.set('district_id', v.districtId)
            g2.set('area_id', v.areaId)
            g2.set('regional_id', v.regionalId)
            g2.set('mix_family', '')
            g2.set('target_base', covBase)
            g2.set('target_bronze', covBronze)
            g2.set('target_prata', covPrata)
            g2.set('target_ouro', covOuro)
            g2.set('target_monthly_coverage', covBase)
            g2.set('target_daily_coverage', covBase > 0 ? covBase / 30 : 0)
            g2.set('target_weekly_coverage', covBase > 0 ? covBase / 4 : 0)
            txApp.save(g2)
          }
          covCount++
        }
      })
    } catch (err) {
      return e.json(400, {
        success: false,
        errors: [{ line: 0, field: 'transaction', value: '', message: err.message }],
        created: 0,
        faturamentoCount: 0,
        coberturaCount: 0,
        totalRows: rows.length,
      })
    }

    var totalGoals = fatCount + covCount
    var expectedGoals = rows.length * 2

    if (!body.skipHistory) {
      try {
        var hc = $app.findCollectionByNameOrId('import_history')
        var hr = new Record(hc)
        hr.set('user_id', body.userId || (e.auth ? e.auth.id : ''))
        hr.set('source', body.source || 'Manual API')
        hr.set('file_name', body.fileName || 'unknown')
        hr.set('stats', {
          created: totalGoals,
          faturamentoCount: fatCount,
          coberturaCount: covCount,
          totalRows: rows.length,
        })
        hr.set('status', 'Sucesso')
        $app.save(hr)
      } catch (_) {}
    }

    return e.json(200, {
      success: true,
      created: totalGoals,
      faturamentoCount: fatCount,
      coberturaCount: covCount,
      totalRows: rows.length,
      totalGoals: totalGoals,
      expectedGoals: expectedGoals,
      countVerified: totalGoals === expectedGoals,
    })
  },
  $apis.requireAuth(),
)
