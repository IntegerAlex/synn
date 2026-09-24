// Error handling utilities

export function formatErrorResponse(error: unknown) {
  if (error instanceof Error) {
    return {
      error: {
        code: "UNKNOWN_ERROR",
        message: error.message,
      },
    };
  }

  return {
    error: {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred",
    },
  };
}
