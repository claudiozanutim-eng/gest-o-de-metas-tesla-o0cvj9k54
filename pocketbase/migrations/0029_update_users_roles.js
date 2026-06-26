/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    const roleField = users.fields.getByName('role')
    roleField.values = [
      'Administrator',
      'National Manager',
      'District Manager',
      'Regional Manager',
      'Seller',
      'Sales Assistant',
      'Gerente Nacional',
      'Gerente Distrital Geral',
      'Gerente Distrital',
      'Gerente Regional',
      'Vendedor',
      'Administrador',
      'Gestor da Empresa',
      'Gerente Nacional de Vendas',
    ]
    app.save(users)

    const records = app.findRecordsByFilter('users', "role != ''", '', 0, 0)
    for (let record of records) {
      let r = record.getString('role')
      let newRole = r
      switch (r) {
        case 'Administrator':
          newRole = 'Administrador'
          break
        case 'National Manager':
        case 'Gerente Nacional':
          newRole = 'Gerente Nacional de Vendas'
          break
        case 'Gerente Distrital Geral':
        case 'Sales Assistant':
          newRole = 'Gestor da Empresa'
          break
        case 'District Manager':
          newRole = 'Gerente Distrital'
          break
        case 'Regional Manager':
          newRole = 'Gerente Regional'
          break
        case 'Seller':
          newRole = 'Vendedor'
          break
      }
      record.set('role', newRole)
      app.save(record)
    }

    roleField.values = [
      'Administrador',
      'Gestor da Empresa',
      'Gerente Nacional de Vendas',
      'Gerente Distrital',
      'Gerente Regional',
      'Vendedor',
    ]
    app.save(users)

    const rules = [
      {
        col: 'users',
        list: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || id = @request.auth.id || (@request.auth.role = 'Gerente Distrital' && district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Vendedor' && id = @request.auth.id)",
        view: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || id = @request.auth.id || (@request.auth.role = 'Gerente Distrital' && district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Vendedor' && id = @request.auth.id)",
        update:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || id = @request.auth.id",
        delete:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || id = @request.auth.id",
      },
      {
        col: 'districts',
        list: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && id = @request.auth.regional_id.district_id) || (@request.auth.role = 'Vendedor' && id = @request.auth.district_id)",
        view: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && id = @request.auth.regional_id.district_id) || (@request.auth.role = 'Vendedor' && id = @request.auth.district_id)",
        create:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
        update:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
        delete:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
      },
      {
        col: 'regionals',
        list: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && id = @request.auth.regional_id) || (@request.auth.role = 'Vendedor' && id = @request.auth.regional_id)",
        view: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && id = @request.auth.regional_id) || (@request.auth.role = 'Vendedor' && id = @request.auth.regional_id)",
        create:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
        update:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
        delete:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
      },
      {
        col: 'areas',
        list: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && (regional_id.district_id = @request.auth.district_id || district_id = @request.auth.district_id)) || (@request.auth.role = 'Gerente Regional' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Vendedor' && id = @request.auth.area_id) || responsible_id = @request.auth.id",
        view: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && (regional_id.district_id = @request.auth.district_id || district_id = @request.auth.district_id)) || (@request.auth.role = 'Gerente Regional' && regional_id = @request.auth.regional_id) || (@request.auth.role = 'Vendedor' && id = @request.auth.area_id) || responsible_id = @request.auth.id",
        create:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
        update:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
        delete:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
      },
      {
        col: 'goals',
        list: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id",
        view: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id",
        create:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id",
        update:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id",
        delete:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
      },
      {
        col: 'actual_performance',
        list: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id",
        view: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id",
        create:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id",
        update:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && seller_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && seller_id.regional_id = @request.auth.regional_id) || seller_id = @request.auth.id",
        delete: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa'",
      },
      {
        col: 'sellers',
        list: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && user_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && user_id.regional_id = @request.auth.regional_id) || user_id = @request.auth.id",
        view: "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas' || (@request.auth.role = 'Gerente Distrital' && user_id.district_id = @request.auth.district_id) || (@request.auth.role = 'Gerente Regional' && user_id.regional_id = @request.auth.regional_id) || user_id = @request.auth.id",
        create:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
        update:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
        delete:
          "@request.auth.role = 'Administrador' || @request.auth.role = 'Gestor da Empresa' || @request.auth.role = 'Gerente Nacional de Vendas'",
      },
      {
        col: 'system_parameters',
        create: "@request.auth.role = 'Administrador'",
        update: "@request.auth.role = 'Administrador'",
        delete: "@request.auth.role = 'Administrador'",
      },
      {
        col: 'product_families',
        create: "@request.auth.role = 'Administrador'",
        update: "@request.auth.role = 'Administrador'",
        delete: "@request.auth.role = 'Administrador'",
      },
      {
        col: 'commission_tiers',
        create: "@request.auth.role = 'Administrador'",
        update: "@request.auth.role = 'Administrador'",
        delete: "@request.auth.role = 'Administrador'",
      },
    ]

    for (const r of rules) {
      const col = app.findCollectionByNameOrId(r.col)
      if (r.list !== undefined) col.listRule = r.list
      if (r.view !== undefined) col.viewRule = r.view
      if (r.create !== undefined) col.createRule = r.create
      if (r.update !== undefined) col.updateRule = r.update
      if (r.delete !== undefined) col.deleteRule = r.delete
      app.save(col)
    }
  },
  (app) => {
    // empty down migration
  },
)
