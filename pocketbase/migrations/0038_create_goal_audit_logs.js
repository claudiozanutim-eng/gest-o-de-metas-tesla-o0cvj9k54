migrate(
  (app) => {
    const goalsCollection = app.findCollectionByNameOrId('goals')

    const collection = new Collection({
      name: 'goal_audit_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'goal_id',
          type: 'relation',
          required: true,
          collectionId: goalsCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'old_values', type: 'json', required: false },
        { name: 'new_values', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_goal_audit_goal_id ON goal_audit_logs (goal_id)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('goal_audit_logs')
    app.delete(collection)
  },
)
