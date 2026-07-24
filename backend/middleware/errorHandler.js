const AppError = require("../utils/AppError");

const errorHandler = (error, req, res, next) => {
  
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.errorCode,
        message: error.message,
      },
    });
  }

  if (error?.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern ?? {})[0] ?? "field";

    return res.status(409).json({
      success: false,
      error: {
        code: "DUPLICATE_VALUE",
        message: `A user with this ${duplicateField} already exists`,
      },
    });
  }

  if (error?.name === "ValidationError") {
    const details = Object.values(error.errors).map((validationError) => ({
      field: validationError.path,
      message: validationError.message,
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "The submitted data is invalid",
        details,
      },
    });
  }

  console.error("Unexpected error:", error);
  if (error?.name === "MulterError") {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        error: {
          code: "INVOICE_FILE_TOO_LARGE",
          message: "Invoice files cannot exceed 10 MB",
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        code: "FILE_UPLOAD_ERROR",
        message: error.message,
      },
    });
  }

  if (error?.code === "INVALID_INVOICE_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_INVOICE_FILE_TYPE",
        message: "Only PDF invoice files are allowed",
      },
    });
  }
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};

module.exports = errorHandler;
