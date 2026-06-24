migrate(
  (app) => {
    const system_parameters = new Collection({
      name: 'system_parameters',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'Administrator'",
      updateRule: "@request.auth.role = 'Administrator'",
      deleteRule: "@request.auth.role = 'Administrator'",
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'json', required: true },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_sys_param_key ON system_parameters (key)'],
    })
    app.save(system_parameters)

    const product_families = new Collection({
      name: 'product_families',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'Administrator'",
      updateRule: "@request.auth.role = 'Administrator'",
      deleteRule: "@request.auth.role = 'Administrator'",
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_family_code ON product_families (code)'],
    })
    app.save(product_families)

    const users = app.findCollectionByNameOrId('users')

    const rules =
      "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant' || (@request.auth.role = 'District Manager' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Regional Manager' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id"

    const goals = new Collection({
      name: 'goals',
      type: 'base',
      listRule: rules,
      viewRule: rules,
      createRule:
        "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant'",
      updateRule:
        "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant'",
      deleteRule: "@request.auth.role = 'Administrator'",
      fields: [
        {
          name: 'seller_id',
          type: 'relation',
          collectionId: users.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'period', type: 'text', required: true }, // 'YYYY-MM'
        { name: 'metric', type: 'text', required: true }, // 'Revenue', 'Mix_F1', 'Mix_F2', 'Mix_F3', 'Mix_Outros', 'Coverage'
        { name: 'target_base', type: 'number', required: true },
        { name: 'target_bronze', type: 'number', required: true },
        { name: 'target_prata', type: 'number', required: true },
        { name: 'target_ouro', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_goals_unique ON goals (seller_id, period, metric)'],
    })
    app.save(goals)

    const actual_performance = new Collection({
      name: 'actual_performance',
      type: 'base',
      listRule: rules,
      viewRule: rules,
      createRule:
        "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant'",
      updateRule:
        "@request.auth.role = 'Administrator' || @request.auth.role = 'National Manager' || @request.auth.role = 'Sales Assistant'",
      deleteRule: "@request.auth.role = 'Administrator'",
      fields: [
        {
          name: 'seller_id',
          type: 'relation',
          collectionId: users.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'period', type: 'text', required: true },
        { name: 'metric', type: 'text', required: true },
        { name: 'actual_value', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_actual_perf_unique ON actual_performance (seller_id, period, metric)',
      ],
    })
    app.save(actual_performance)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('actual_performance'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('goals'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('product_families'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('system_parameters'))
    } catch (_) {}
  },
)
