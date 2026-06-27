migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('_pb_users_auth_')

    const collection = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: 'user_id = @request.auth.id',
      viewRule: 'user_id = @request.auth.id',
      createRule: '',
      updateRule: 'user_id = @request.auth.id',
      deleteRule: 'user_id = @request.auth.id',
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: false,
          values: ['info', 'success', 'warning', 'error'],
          maxSelect: 1,
        },
        { name: 'is_read', type: 'bool', required: false },
        { name: 'link', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notifications_user_id ON notifications (user_id)',
        'CREATE INDEX idx_notifications_is_read ON notifications (is_read)',
        'CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('notifications')
    app.delete(collection)
  },
)
