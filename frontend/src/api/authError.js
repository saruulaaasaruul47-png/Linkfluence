const connectionMessage = 'Сервертэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.'

export function parseAuthError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) {
    return {
      code: 'CONNECTION_ERROR',
      message: connectionMessage,
      details: null,
      status: 0,
    }
  }

  const backendError = error.response.data?.error
  return {
    code: backendError?.code || 'REQUEST_FAILED',
    message: backendError?.message || error.message || fallback,
    details: backendError?.details || null,
    status: error.response.status,
  }
}
