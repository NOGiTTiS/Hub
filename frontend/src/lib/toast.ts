import React from "react"
import { toast as sonnerToast, ExternalToast } from "sonner"

/**
 * Custom Toast helper with differentiated default durations:
 * - success: 3 seconds (3,000 ms)
 * - info: 3 seconds (3,000 ms)
 * - warning: 4 seconds (4,000 ms)
 * - error: 5 seconds (5,000 ms)
 */
export const toast = Object.assign(
  (message: React.ReactNode, data?: ExternalToast) =>
    sonnerToast(message, { duration: 3000, ...data }),
  {
    ...sonnerToast,
    success: (message: React.ReactNode, data?: ExternalToast) =>
      sonnerToast.success(message, { duration: 3000, ...data }),
    error: (message: React.ReactNode, data?: ExternalToast) =>
      sonnerToast.error(message, { duration: 5000, ...data }),
    warning: (message: React.ReactNode, data?: ExternalToast) =>
      sonnerToast.warning(message, { duration: 4000, ...data }),
    info: (message: React.ReactNode, data?: ExternalToast) =>
      sonnerToast.info(message, { duration: 3000, ...data }),
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    custom: sonnerToast.custom,
  }
)
