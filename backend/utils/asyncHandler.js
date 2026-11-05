export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}
