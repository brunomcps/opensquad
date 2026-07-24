export class CommercialIntelligenceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = 'CommercialIntelligenceError';
  }
}

export function safeError(error: unknown): CommercialIntelligenceError {
  return error instanceof CommercialIntelligenceError
    ? error
    : new CommercialIntelligenceError('internal_error', 'Falha na Inteligência Comercial.', 500);
}
