export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export function requireValue<T>(value: T | null | undefined, message: string, statusCode = 404): T {
  if (value == null) {
    throw new ApplicationError(message, statusCode);
  }

  return value;
}


