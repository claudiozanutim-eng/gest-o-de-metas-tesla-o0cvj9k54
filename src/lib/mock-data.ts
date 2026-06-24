export const mockHierarchy = {
  distritos: [
    { id: 'd1', name: 'Distrito Sul' },
    { id: 'd2', name: 'Distrito Sudeste' },
  ],
  regionais: [
    { id: 'r1', distritoId: 'd1', name: 'Regional Paraná' },
    { id: 'r2', distritoId: 'd1', name: 'Regional Santa Catarina' },
    { id: 'r3', distritoId: 'd2', name: 'Regional SP Interior' },
  ],
  areas: [
    { id: 'a1', regionalId: 'r1', name: 'Área Curitiba' },
    { id: 'a2', regionalId: 'r1', name: 'Área Londrina' },
    { id: 'a3', regionalId: 'r3', name: 'Área Campinas' },
  ],
  vendedores: [
    { id: 'v1', areaId: 'a1', name: 'João Silva' },
    { id: 'v2', areaId: 'a1', name: 'Maria Santos' },
    { id: 'v3', areaId: 'a3', name: 'Carlos Ferreira' },
  ],
}

export const mockDashboardData = {
  kpis: {
    faturamento: { current: 1250000, meta: 1500000, progress: 83 },
    mix: { current: 85, meta: 100, progress: 85 },
    cobertura: { current: 92, meta: 100, progress: 92 },
    categoria: 'Bronze', // Base, Bronze, Prata, Ouro
  },
  charts: {
    faturamentoMensal: [
      { name: 'Jan', meta: 200000, realizado: 180000 },
      { name: 'Fev', meta: 220000, realizado: 210000 },
      { name: 'Mar', meta: 250000, realizado: 260000 },
      { name: 'Abr', meta: 240000, realizado: 200000 },
      { name: 'Mai', meta: 280000, realizado: 290000 },
      { name: 'Jun', meta: 310000, realizado: 110000 }, // Current month partial
    ],
    mixFamilias: [
      { name: 'F1 - Automação', value: 450000, fill: 'hsl(var(--chart-1))' },
      { name: 'F2 - Robótica', value: 300000, fill: 'hsl(var(--chart-2))' },
      { name: 'F3 - Sensores', value: 200000, fill: 'hsl(var(--chart-3))' },
      { name: 'Outros', value: 150000, fill: 'hsl(var(--chart-4))' },
    ],
  },
  breakdown: [
    {
      id: '1',
      name: 'Área Curitiba',
      meta: 500000,
      realizado: 420000,
      percentual: 84,
      categoria: 'Bronze',
    },
    {
      id: '2',
      name: 'Área Londrina',
      meta: 300000,
      realizado: 315000,
      percentual: 105,
      categoria: 'Prata',
    },
    {
      id: '3',
      name: 'Área Ponta Grossa',
      meta: 200000,
      realizado: 150000,
      percentual: 75,
      categoria: 'Base',
    },
  ],
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
