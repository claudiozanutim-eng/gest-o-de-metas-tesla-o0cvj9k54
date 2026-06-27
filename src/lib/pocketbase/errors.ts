import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

const PT_ERROR_MAP: Record<string, string> = {
  'The request requires valid record authorization token.':
    'Sessão expirada. Faça login novamente.',
  'Failed to authenticate.': 'Falha na autenticação. Verifique suas credenciais.',
  'Failed to authenticate. Missing email or password.': 'Email ou senha incorretos.',
  'Invalid email or password.': 'Email ou senha incorretos.',
  'The authorized record is not allowed to perform this action.':
    'Você não tem permissão para executar esta ação.',
  'You are not allowed to perform this request.': 'Você não tem permissão para executar esta ação.',
  'Missing required request parameters.': 'Parâmetros obrigatórios ausentes.',
  'Invalid format. Parameter must be a valid JSON string.': 'Formato inválido.',
  'Nothing to return.': 'Nenhum registro encontrado.',
  'Invalid filter.': 'Filtro inválido.',
  'autocancel.': 'Operação cancelada.',
}

const PT_FIELD_ERROR_MAP: Record<string, string> = {
  validation_required: 'Este campo é obrigatório.',
  validation_not_unique: 'Este registro já existe.',
  validation_is_email: 'Email inválido.',
  validation_min_text_constraint: 'Texto muito curto.',
  validation_max_text_constraint: 'Texto muito longo.',
  validation_file_size_limit: 'Arquivo muito grande.',
  validation_missing_rel_records: 'Registro relacionado não encontrado.',
  validation_invalid_value: 'Valor inválido.',
  validation_min_value_constraint: 'Valor muito baixo.',
  validation_max_value_constraint: 'Valor muito alto.',
}

function translateMessage(msg: string): string {
  for (const [eng, pt] of Object.entries(PT_ERROR_MAP)) {
    if (msg.includes(eng)) return pt
  }
  return msg
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
      const code = (detail as { code?: string }).code || ''
      const message = (detail as { message: string }).message
      errors[field] = PT_FIELD_ERROR_MAP[code] || translateMessage(message)
    }
  }
  return errors
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error) return translateMessage(error.message)
    return 'Ocorreu um erro inesperado.'
  }
  const msgs = Object.values(extractFieldErrors(error))
  if (msgs.length > 0) return msgs.join(' ')
  return translateMessage(error.message) || 'Ocorreu um erro inesperado.'
}
