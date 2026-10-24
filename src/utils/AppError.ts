// שגיאה "מתוכננת" עם קוד HTTP והודעה בעברית.
// כל שירות זורק AppError, ו-errorHandler הופך אותה לתשובת JSON אחידה.

export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: ErrorDetail[]) {
    return new AppError(400, message, details);
  }

  static unauthorized(message = 'נדרשת התחברות') {
    return new AppError(401, message);
  }

  static forbidden(message = 'אין לך הרשאה לבצע פעולה זו') {
    return new AppError(403, message);
  }

  static notFound(message = 'לא נמצא') {
    return new AppError(404, message);
  }

  static conflict(message: string) {
    return new AppError(409, message);
  }
}
