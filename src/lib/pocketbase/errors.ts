import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

const PT_BR_PATTERNS: Array<[RegExp, string]> = [
  [
    /The authorized record is not allowed to perform this action/i,
    'Acesso negado: você não tem permissão para esta operação.',
  ],
  [/validation_required/i, 'Este campo é obrigatório.'],
  [/validation_not_unique/i, 'Este valor já existe no sistema.'],
  [/validation_is_email/i, 'E-mail inválido.'],
  [/validation_min_text_constraint/i, 'Texto muito curto.'],
  [/validation_max_text_constraint/i, 'Texto muito longo.'],
  [/validation_file_size_limit/i, 'Arquivo muito grande.'],
  [/validation_missing_rel_records/i, 'Registro relacionado não encontrado.'],
]

function translateMsg(msg: string): string {
  let result = msg
  for (const [pattern, replacement] of PT_BR_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  if (/cannot be blank/i.test(result)) {
    result = result.replace(/.*cannot be blank.*/i, 'Este campo é obrigatório.')
  }
  return result
}

function translateFieldMessage(field: string, msg: string): string {
  if (/cannot be blank/i.test(msg)) {
    return `O campo ${field} é obrigatório.`
  }
  const translated = translateMsg(msg)
  return translated === msg ? msg : translated
}

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = translateFieldMessage(field, (detail as { message: string }).message)
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  }
  if (error.status === 403) {
    return 'Acesso negado: você não tem permissão para esta operação.'
  }
  if (error.status === 401) {
    return 'Sessão expirada. Faça login novamente.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) return msgs.join(' ')
  return translateMsg(error.message || 'Ocorreu um erro inesperado.')
}
