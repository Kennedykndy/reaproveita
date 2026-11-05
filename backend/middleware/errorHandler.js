export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(error, req, res, next) {
  console.error(error);

  if (res.headersSent) return next(error);

  const status = Number(error.status || 500);
  res.status(status).json({
    success: false,
    message: status >= 500 ? "Erro interno do servidor." : error.message
  });
}
