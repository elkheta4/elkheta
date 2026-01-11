/**
 * WRITE QUEUE
 * 
 * Serializes write operations to prevent concurrent writes from
 * overwhelming the Google Sheets API.
 * 
 * Features:
 * - Sequential processing of write operations
 * - Configurable delay between operations
 * - Automatic retry on failure
 */

import { withRetry, delay } from './retryUtils';

// Queue state
let writeQueue = [];
let isProcessing = false;
const MIN_DELAY_BETWEEN_WRITES = 100; // 100ms between writes

// Stats for monitoring
let stats = {
  totalQueued: 0,
  totalProcessed: 0,
  totalFailed: 0
};

/**
 * Add a write operation to the queue
 * @param {Function} operation - Async function that performs the write
 * @param {string} operationName - Name for logging
 * @returns {Promise} - Resolves when operation completes
 */
export const queueWrite = (operation, operationName = 'Write') => {
  return new Promise((resolve, reject) => {
    stats.totalQueued++;
    
    writeQueue.push({
      operation,
      operationName,
      resolve,
      reject,
      queuedAt: Date.now()
    });

    // Start processing if not already running
    processQueue();
  });
};

/**
 * Process the write queue sequentially
 */
const processQueue = async () => {
  if (isProcessing || writeQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (writeQueue.length > 0) {
    const item = writeQueue.shift();
    const waitTime = Date.now() - item.queuedAt;

    try {
      console.log(`[WriteQueue] Processing: ${item.operationName} (waited ${waitTime}ms, ${writeQueue.length} remaining)`);
      
      // Execute with retry
      const result = await withRetry(item.operation, {
        operationName: item.operationName,
        maxRetries: 3
      });

      stats.totalProcessed++;
      item.resolve(result);

    } catch (error) {
      console.error(`[WriteQueue] Failed: ${item.operationName}`, error.message);
      stats.totalFailed++;
      item.reject(error);
    }

    // Small delay between operations to prevent rate limiting
    if (writeQueue.length > 0) {
      await delay(MIN_DELAY_BETWEEN_WRITES);
    }
  }

  isProcessing = false;
};

/**
 * Get queue statistics
 */
export const getQueueStats = () => ({
  ...stats,
  currentQueueLength: writeQueue.length,
  isProcessing
});

/**
 * Clear the queue (use with caution - pending operations will be rejected)
 */
export const clearQueue = () => {
  const cleared = writeQueue.length;
  
  writeQueue.forEach(item => {
    item.reject(new Error('Queue cleared'));
  });
  
  writeQueue = [];
  
  console.log(`[WriteQueue] Cleared ${cleared} pending operations`);
  return cleared;
};
