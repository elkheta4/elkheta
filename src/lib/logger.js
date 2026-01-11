/**
 * Centralized Logging Utility
 * Logs errors with context for debugging and monitoring
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Format log message with timestamp and context
   */
  _formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A'
    };
  }

  /**
   * Log error with context
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or context
   * @param {Object} additionalContext - Additional context
   */
  error(message, error = null, additionalContext = {}) {
    const context = {
      ...additionalContext,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };

    const logEntry = this._formatMessage(LOG_LEVELS.ERROR, message, context);
    
    // Console log in development
    if (this.isDevelopment) {
      console.error(`[${logEntry.timestamp}] ERROR:`, message, context);
    }

    // TODO: Send to external logging service in production
    // Example: Sentry, LogRocket, CloudWatch, etc.
    // this._sendToService(logEntry);

    return logEntry;
  }

  /**
   * Log warning
   */
  warn(message, context = {}) {
    const logEntry = this._formatMessage(LOG_LEVELS.WARN, message, context);
    
    if (this.isDevelopment) {
      console.warn(`[${logEntry.timestamp}] WARN:`, message, context);
    }

    return logEntry;
  }

  /**
   * Log info
   */
  info(message, context = {}) {
    const logEntry = this._formatMessage(LOG_LEVELS.INFO, message, context);
    
    if (this.isDevelopment) {
      console.info(`[${logEntry.timestamp}] INFO:`, message, context);
    }

    return logEntry;
  }

  /**
   * Log debug (only in development)
   */
  debug(message, context = {}) {
    if (!this.isDevelopment) return;

    const logEntry = this._formatMessage(LOG_LEVELS.DEBUG, message, context);
    console.debug(`[${logEntry.timestamp}] DEBUG:`, message, context);

    return logEntry;
  }

  /**
   * Send logs to external service (placeholder)
   */
  _sendToService(logEntry) {
    // TODO: Implement external logging service integration
    // Example with Sentry:
    // Sentry.captureException(logEntry);
    
    // Example with custom API:
    // fetch('/api/logs', {
    //   method: 'POST',
    //   body: JSON.stringify(logEntry)
    // });
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
