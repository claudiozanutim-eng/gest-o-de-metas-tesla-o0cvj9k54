migrate(
  (app) => {
    let brasilId = null
    try {
      const brasil = app.findFirstRecordByData('districts', 'name', 'Brasil')
      brasilId = brasil.id
    } catch (_) {
      // If "Brasil" district is not found, we abort the cleanup to avoid deleting everything.
      return
    }

    // 1. Unlink Users from the deleted entities
    app
      .db()
      .newQuery(
        `UPDATE users SET district_id = '' WHERE district_id != {:brasilId} AND district_id != ''`,
      )
      .bind({ brasilId })
      .execute()
    app
      .db()
      .newQuery(
        `UPDATE users SET regional_id = '' WHERE regional_id IN (SELECT id FROM regionals WHERE district_id != {:brasilId})`,
      )
      .bind({ brasilId })
      .execute()
    app
      .db()
      .newQuery(
        `UPDATE users SET area_id = '' WHERE area_id IN (SELECT id FROM areas WHERE (district_id != {:brasilId} AND district_id != '') OR regional_id IN (SELECT id FROM regionals WHERE district_id != {:brasilId}))`,
      )
      .bind({ brasilId })
      .execute()

    // 2. Unlink Sellers from the deleted areas
    app
      .db()
      .newQuery(
        `UPDATE sellers SET area_id = '' WHERE area_id IN (SELECT id FROM areas WHERE (district_id != {:brasilId} AND district_id != '') OR regional_id IN (SELECT id FROM regionals WHERE district_id != {:brasilId}))`,
      )
      .bind({ brasilId })
      .execute()

    // 3. Unlink Goals from the deleted entities
    app
      .db()
      .newQuery(
        `UPDATE goals SET regional_id = '' WHERE regional_id IN (SELECT id FROM regionals WHERE district_id != {:brasilId})`,
      )
      .bind({ brasilId })
      .execute()
    app
      .db()
      .newQuery(
        `UPDATE goals SET area_id = '' WHERE area_id IN (SELECT id FROM areas WHERE (district_id != {:brasilId} AND district_id != '') OR regional_id IN (SELECT id FROM regionals WHERE district_id != {:brasilId}))`,
      )
      .bind({ brasilId })
      .execute()

    // 4. Delete Areas linked to deleted districts/regionals
    app
      .db()
      .newQuery(
        `DELETE FROM areas WHERE (district_id != {:brasilId} AND district_id != '') OR regional_id IN (SELECT id FROM regionals WHERE district_id != {:brasilId})`,
      )
      .bind({ brasilId })
      .execute()

    // 5. Delete Regionals linked to deleted districts
    app
      .db()
      .newQuery(`DELETE FROM regionals WHERE district_id != {:brasilId}`)
      .bind({ brasilId })
      .execute()

    // 6. Delete redundant Districts
    app.db().newQuery(`DELETE FROM districts WHERE id != {:brasilId}`).bind({ brasilId }).execute()
  },
  (app) => {
    // Reverting data deletion is not possible
  },
)
