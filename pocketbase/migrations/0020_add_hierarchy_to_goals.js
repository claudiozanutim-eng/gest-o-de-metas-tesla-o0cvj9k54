/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')
    let changed = false

    if (!goals.fields.getByName('regional_id')) {
      goals.fields.add(
        new RelationField({
          name: 'regional_id',
          collectionId: app.findCollectionByNameOrId('regionals').id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
      changed = true
    }

    if (!goals.fields.getByName('area_id')) {
      goals.fields.add(
        new RelationField({
          name: 'area_id',
          collectionId: app.findCollectionByNameOrId('areas').id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
      changed = true
    }

    if (changed) {
      app.save(goals)
    }
  },
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')
    let changed = false

    if (goals.fields.getByName('regional_id')) {
      goals.fields.removeByName('regional_id')
      changed = true
    }

    if (goals.fields.getByName('area_id')) {
      goals.fields.removeByName('area_id')
      changed = true
    }

    if (changed) {
      app.save(goals)
    }
  },
)
