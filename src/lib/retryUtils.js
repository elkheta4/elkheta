/**
 * RETRY UTILITIES
 * 
 * Provides exponential backoff retry logic for Google API calls.
 * Handles rate limiting (429) and quota errors gracefully.
 */

/**
 * Promise-based delay
 * @param {number} ms - Milliseconds to wait
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if error is a rate limit error
 * @param {Error} error 
 * @returns {boolean}
 */
export const isRateLimitError = (error) => {
  if (!error) return false;
  
  // HTTP 429
  if (error.status === 429 || error.code === 429) return true;
  
  // Google API quota messages
  const message = String(error.message || '').toLowerCase();
  if (message.includes('quota exceeded')) return true;
  if (message.includes('rate limit')) return true;
  if (message.includes('too many requests')) return true;
  if (message.includes('resource exhausted')) return true;
  
  return false;
};

/**
 * Execute function with retry and exponential backoff
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Configuration
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Max delay cap in ms (default: 10000)
 * @param {string} options.operationName - Name for logging (default: 'Operation')
 * @returns {Promise<any>}
 */
export const withRetry = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    operationName = 'Operation'
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const isLast = attempt === maxRetries;
      const shouldRetry = isRateLimitError(error) && !isLast;

      if (shouldRetry) {
        // Exponential backoff: 1s, 2s, 4s, 8s... capped at maxDelay
        const waitTime = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        
        console.log('');
        console.log('============================================================');
        console.log(`[Retry] ${operationName}`);
        console.log('------------------------------------------------------------');
        console.log(`  Attempt: ${attempt + 1}/${maxRetries + 1}`);
        console.log(`  Error: ${error.message}`);
        console.log(`  Waiting: ${waitTime}ms before retry...`);
        console.log('============================================================');
        console.log('');
        
        await delay(waitTime);
        continue;
      }

      // Don't retry - throw immediately
      throw error;
    }
  }

  // Should not reach here, but just in case
  throw lastError;
};

/**
 * Batch delay utility for queue processing
 * Returns a function that enforces minimum delay between calls
 */
export const createThrottledExecutor = (minDelayMs = 100) => {
  let lastExecutionTime = 0;

  return async (fn) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTime;
    
    if (timeSinceLastExecution < minDelayMs) {
      await delay(minDelayMs - timeSinceLastExecution);
    }

    lastExecutionTime = Date.now();
    return fn();
  };
};
