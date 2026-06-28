export function isCoverageMetric(metric: string): boolean {
  if (!metric) return false
  const m = metric.toLowerCase()
  return m === 'coverage' || m.includes('cobertura')
}

export function isCurrencyMetric(metric: string): boolean {
  return !isCoverageMetric(metric)
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMetricValue(value: number, metric: string): string {
  if (isCoverageMetric(metric)) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return currencyFormatter.format(value)
}

const trackingCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatTrackingValue(value: number, metric: string): string {
  if (isCoverageMetric(metric)) {
    return value.toLocaleString('pt-BR')
  }
  return trackingCurrencyFormatter.format(value)
}
