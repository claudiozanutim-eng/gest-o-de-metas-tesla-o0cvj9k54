/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')

    if (!goals.fields.getByName('district_id')) {
      goals.fields.add(
        new RelationField({
          name: 'district_id',
          collectionId: app.findCollectionByNameOrId('districts').id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(goals)
    }

    app
      .db()
      .newQuery(
        "UPDATE goals SET district_id = (SELECT district_id FROM regionals WHERE regionals.id = goals.regional_id) WHERE goals.district_id = '' AND goals.regional_id != ''",
      )
      .execute()

    app
      .db()
      .newQuery(
        "UPDATE goals SET district_id = (SELECT district_id FROM areas WHERE areas.id = goals.area_id) WHERE goals.district_id = '' AND goals.area_id != ''",
      )
      .execute()
  },
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')

    if (goals.fields.getByName('district_id')) {
      goals.fields.removeByName('district_id')
      app.save(goals)
    }
  },
)
