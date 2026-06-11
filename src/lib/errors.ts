export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, code?: string) {
    return new AppError(message, 400, code ?? 'BAD_REQUEST');
  }

  static notFound(message: string) {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new AppError(message, 409, 'CONFLICT');
  }

  static validation(message: string) {
    return new AppError(message, 422, 'VALIDATION_ERROR');
  }
}
