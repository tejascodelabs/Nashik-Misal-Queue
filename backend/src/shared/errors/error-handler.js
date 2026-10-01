export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || (
    error.code === "LIMIT_FILE_SIZE"
      ? 413
      : error.code?.startsWith("LIMIT_")
        ? 400
        : 500
  );
  const message = statusCode === 500
    ? "Internal server error"
    : error.code === "LIMIT_FILE_SIZE"
      ? "Image file size must not exceed 2 MB"
      : error.message;

  console.error(`${req.method} ${req.originalUrl}`, error);

  return res.status(statusCode).json({
    success: false,
    message,
    ...(error.details ? { details: error.details } : {}),
  });
};
