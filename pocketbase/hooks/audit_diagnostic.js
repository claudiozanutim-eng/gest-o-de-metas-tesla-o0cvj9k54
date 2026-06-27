routerAdd(
  'GET',
  '/backend/v1/audit/diagnostic',
  (e) => {
    if (!e.auth || e.auth.getString('role') !== 'Administrador') {
      return e.forbiddenError('Acesso restrito a administradores.')
    }

    const getCount = (query) => {
      const result = new DynamicModel({ c: 0 })
      try {
        $app.db().newQuery(query).one(result)
        return result.c
      } catch (err) {
        return 0
      }
    }

    const usersCount = getCount('SELECT COUNT(*) as c FROM users')
    const sellersCount = getCount('SELECT COUNT(*) as c FROM sellers')
    const goalsCount = getCount('SELECT COUNT(*) as c FROM goals')
    const perfCount = getCount('SELECT COUNT(*) as c FROM actual_performance')
    const regionalsCount = getCount('SELECT COUNT(*) as c FROM regionals')
    const districtsCount = getCount('SELECT COUNT(*) as c FROM districts')
    const areasCount = getCount('SELECT COUNT(*) as c FROM areas')

    const usersDuplicates = getCount(
      "SELECT COUNT(*) as c FROM (SELECT email FROM users WHERE email != '' GROUP BY email HAVING COUNT(*) > 1)",
    )
    const usersOrphans = getCount(
      "SELECT COUNT(id) as c FROM users WHERE role = 'Vendedor' AND id NOT IN (SELECT user_id FROM sellers WHERE user_id IS NOT NULL AND user_id != '')",
    )

    const sellersOrphans = getCount(
      "SELECT COUNT(id) as c FROM sellers WHERE (user_id IS NOT NULL AND user_id != '' AND user_id NOT IN (SELECT id FROM users)) OR user_id = '' OR user_id IS NULL",
    )
    const sellersMissingHierarchy = getCount(
      "SELECT COUNT(id) as c FROM sellers WHERE area_id = '' OR area_id IS NULL",
    )

    const goalsInvalidRefs = getCount(
      "SELECT COUNT(id) as c FROM goals WHERE seller_id NOT IN (SELECT id FROM users) OR (area_id != '' AND area_id NOT IN (SELECT id FROM areas)) OR (regional_id != '' AND regional_id NOT IN (SELECT id FROM regionals))",
    )
    const goalsDuplicates = getCount(
      'SELECT COUNT(*) as c FROM (SELECT seller_id, period, metric, mix_family FROM goals GROUP BY seller_id, period, metric, mix_family HAVING COUNT(id) > 1)',
    )
    const goalsLogicViolations = getCount(
      'SELECT COUNT(id) as c FROM goals WHERE (target_bronze >= target_prata AND target_prata > 0) OR (target_prata >= target_ouro AND target_ouro > 0)',
    )

    const perfInvalidRefs = getCount(
      'SELECT COUNT(id) as c FROM actual_performance ap WHERE seller_id NOT IN (SELECT id FROM users) OR NOT EXISTS (SELECT 1 FROM goals g WHERE g.seller_id = ap.seller_id AND g.period = ap.period AND g.metric = ap.metric)',
    )

    return e.json(200, {
      totals: {
        users: usersCount,
        sellers: sellersCount,
        goals: goalsCount,
        performance: perfCount,
        regionals: regionalsCount,
        districts: districtsCount,
        areas: areasCount,
      },
      issues: {
        usersDuplicates,
        usersOrphans,
        sellersOrphans,
        sellersMissingHierarchy,
        goalsInvalidRefs,
        goalsDuplicates,
        goalsLogicViolations,
        perfInvalidRefs,
      },
    })
  },
  $apis.requireAuth(),
)
