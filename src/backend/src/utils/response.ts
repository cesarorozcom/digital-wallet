export interface SuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data?: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  stack?: string;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

export function formatSuccessResponse<T>(
  data?: T,
  message?: string,
): SuccessResponse<T> {
  return {
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
  };
}

export function formatErrorResponse(
  error: string,
  details?: unknown,
  stack?: string,
): ErrorResponse {
  return {
    success: false,
    error,
    ...(details !== undefined ? { details } : {}),
    ...(stack ? { stack } : {}),
  };
}

