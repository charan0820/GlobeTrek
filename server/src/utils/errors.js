export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}
export const missing = (name = "Resource") =>
  new AppError(404, "NOT_FOUND", `${name} not found.`);
