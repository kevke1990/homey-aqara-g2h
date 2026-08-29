'use strict';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const status = Number(error?.statusCode || error?.status || 0);
  if (status === 401 || status === 403 || status === 404) return false;
  if (status >= 500) return true;
  const code = String(error?.code || '').toUpperCase();
  return ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)
    || /timeout|network|socket/i.test(String(error?.message || ''));
}

async function withExponentialBackoff(operation, {
  retries = 3,
  baseDelayMs = 500,
  maxDelayMs = 8000,
  shouldRetry = isRetryableError,
  onRetry = null,
} = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) throw error;
      const delay = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
      if (typeof onRetry === 'function') await onRetry({ attempt: attempt + 1, delay, error });
      await sleep(delay);
      attempt += 1;
    }
  }
}

module.exports = { withExponentialBackoff, isRetryableError };
