/**
 * SERVER-SIDE CACHE (Singleton Pattern) - ENHANCED
 * 
 * Purpose: Reduce Google Sheets API calls by caching data on the server.
 * 
 * Features:
 * - Promise-based deduplication (no polling loops)
 * - Stale-while-revalidate pattern
 * - Soft invalidation (keeps stale data while refreshing)
 * - Pre-warming support
 * 
 * How it works:
 * - First request fetches from Google Sheets and caches in RAM
 * - Concurrent requests share the same fetch promise (no stampede)
 * - After TTL expires, returns stale data while refreshing in background
 * - Soft invalidation marks data as stale without clearing
 */

// ============================================
// CONFIG
// ============================================

export const CACHE_CONFIG = {
  SALES_TTL: 300000,      // 5 minutes for Sales
  USERS_TTL: 300000,    // 5 hours for Users
};

// ============================================
// CACHE STORAGE (Global - Singleton)
// ============================================

let salesCache = {
  data: null,
  lastFetchTime: 0,
  fetchPromise: null,      // Shared promise for deduplication
  fetchFunction: null      // Store fetch function for background refresh
};

let usersCache = {
  data: null,
  lastFetchTime: 0,
  fetchPromise: null,
  fetchFunction: null
};

// ============================================
// LOGGING UTILITIES
// ============================================

const divider = '============================================================';
const thinDivider = '------------------------------------------------------------';

const formatTime = () => {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const logCacheStatus = (cacheName, action, details) => {
  console.log('');
  console.log(divider);
  console.log(`[SERVER CACHE] ${cacheName.toUpperCase()}`);
  console.log(thinDivider);
  console.log(`Time: ${formatTime()}`);
  console.log(`Action: ${action}`);
  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }
  console.log(divider);
  console.log('');
};

// ============================================
// SALES CACHE API (ENHANCED)
// ============================================

export const SalesCache = {
  /**
   * Get data from cache or fetch if needed
   * Uses promise-based deduplication to prevent stampede
   */
  async getOrFetch(fetchFn, force = false) {
    const ttl = CACHE_CONFIG.SALES_TTL;
    const cacheAge = salesCache.lastFetchTime ? Math.round((Date.now() - salesCache.lastFetchTime) / 1000) : null;

    // Store fetch function for background refresh
    salesCache.fetchFunction = fetchFn;

    // 1. Cache HIT - Valid data, return immediately (only if not forced)
    if (!force && salesCache.data && (Date.now() - salesCache.lastFetchTime) < ttl) {
      logCacheStatus('Sales', 'CACHE HIT - Using cached data', {
        'Rows in cache': salesCache.data.length,
        'Cache age': `${cacheAge} seconds`,
        'TTL': `${ttl / 1000} seconds`,
        'Google API call': 'NO - Saved an API call!',
        'Result': 'Data returned from RAM instantly'
      });
      return { data: salesCache.data, fromCache: true };
    }

    // 2. Stale-While-Revalidate: Return stale data, refresh in background (only if not forced)
    if (!force && salesCache.data && !salesCache.fetchPromise) {
      logCacheStatus('Sales', 'STALE - Returning cached + Background refresh', {
        'Rows in cache': salesCache.data.length,
        'Cache age': `${cacheAge} seconds (expired)`,
        'Google API call': 'YES - Background refresh started'
      });

      // Start background refresh (fire and forget)
      this._refreshInBackground(fetchFn);

      return { data: salesCache.data, fromCache: true, stale: true };
    }

    // 3. Fetch already in progress - SHARE THE SAME PROMISE
    if (salesCache.fetchPromise) {
      logCacheStatus('Sales', 'WAITING - Sharing fetch promise', {
        'Status': 'Another request is fetching, waiting on same promise',
        'Google API call': 'NO - Reusing in-flight request'
      });

      try {
        const data = await salesCache.fetchPromise;
        return { data, fromCache: true, waited: true };
      } catch (error) {
        // If shared promise fails, return stale data if available
        if (salesCache.data) {
          return { data: salesCache.data, fromCache: true, error: true };
        }
        throw error;
      }
    }

    // 4. No cache, no in-flight request - Start fresh fetch
    logCacheStatus('Sales', 'CACHE MISS - Fetching from Google Sheets', {
      'Previous cache': salesCache.data ? `${salesCache.data.length} rows` : 'Empty',
      'Cache age': cacheAge ? `${cacheAge} seconds (expired > ${ttl / 1000}s)` : 'No previous cache',
      'Google API call': 'YES - Calling Google Sheets API...'
    });

    // Create shared promise
    salesCache.fetchPromise = fetchFn();

    try {
      const startTime = Date.now();
      const freshData = await salesCache.fetchPromise;
      const duration = Date.now() - startTime;

      salesCache.data = freshData;
      salesCache.lastFetchTime = Date.now();

      logCacheStatus('Sales', 'FETCH COMPLETE - Cache updated', {
        'New rows': freshData.length,
        'Fetch time': `${duration}ms`,
        'Saved to': 'Server RAM',
        'Valid for': `${ttl / 1000} seconds`
      });

      return { data: freshData, fromCache: false };

    } catch (error) {
      console.log('');
      console.log('ERROR: Fetch failed -', error.message);

      if (salesCache.data) {
        console.log('FALLBACK: Returning old cache');
        return { data: salesCache.data, fromCache: true, error: true };
      }
      throw error;

    } finally {
      salesCache.fetchPromise = null;
    }
  },

  /**
   * Refresh cache in background (fire and forget)
   * Used for stale-while-revalidate
   */
  async _refreshInBackground(fetchFn) {
    if (salesCache.fetchPromise) return; // Already refreshing

    salesCache.fetchPromise = fetchFn();

    try {
      const startTime = Date.now();
      const freshData = await salesCache.fetchPromise;
      const duration = Date.now() - startTime;

      salesCache.data = freshData;
      salesCache.lastFetchTime = Date.now();

      logCacheStatus('Sales', 'BACKGROUND REFRESH COMPLETE', {
        'New rows': freshData.length,
        'Fetch time': `${duration}ms`
      });

    } catch (error) {
      console.log('[Cache] Background refresh failed:', error.message);
      // Don't throw - this is background, failure is silent
    } finally {
      salesCache.fetchPromise = null;
    }
  },

  /**
   * SOFT Invalidation - Mark as stale but keep data
   * Used after writes to trigger background refresh on next read
   */
  softInvalidate() {
    logCacheStatus('Sales', 'SOFT INVALIDATE - Marked as stale', {
      'Rows kept': salesCache.data?.length || 0,
      'Reason': 'New sale added - will refresh on next read',
      'Data cleared': 'NO - Stale data available for fast response'
    });
    salesCache.lastFetchTime = 0; // Mark as expired
    // Keep salesCache.data for stale-while-revalidate

    // Optionally trigger immediate background refresh
    if (salesCache.fetchFunction && !salesCache.fetchPromise) {
      this._refreshInBackground(salesCache.fetchFunction);
    }
  },

  /**
   * HARD Invalidation - Clear all data (use sparingly)
   */
  invalidate() {
    logCacheStatus('Sales', 'HARD INVALIDATE - Cache cleared', {
      'Cleared rows': salesCache.data?.length || 0,
      'Reason': 'Force refresh requested'
    });
    salesCache.data = null;
    salesCache.lastFetchTime = 0;
    salesCache.fetchPromise = null;
  },

  /**
   * Update cache directly with fresh data
   * Used for force refresh scenarios
   */
  updateCache(data) {
    salesCache.data = data;
    salesCache.lastFetchTime = Date.now();
    salesCache.fetchPromise = null;
    logCacheStatus('Sales', 'CACHE UPDATED DIRECTLY', {
      'Rows': data?.length || 0,
      'Source': 'Force refresh'
    });
  },

  /**
   * Pre-warm the cache (call on server startup)
   */
  async preWarm(fetchFn) {
    if (salesCache.data) {
      console.log('[Cache Warmer] Sales cache already warm');
      return;
    }

    console.log('[Cache Warmer] Pre-warming Sales cache...');
    try {
      await this.getOrFetch(fetchFn);
      console.log('[Cache Warmer] Sales cache warmed successfully');
    } catch (error) {
      console.error('[Cache Warmer] Failed to warm Sales cache:', error.message);
    }
  },

  getStats() {
    return {
      hasData: !!salesCache.data,
      rowCount: salesCache.data?.length || 0,
      ageSeconds: salesCache.lastFetchTime ? Math.round((Date.now() - salesCache.lastFetchTime) / 1000) : null,
      isFetching: !!salesCache.fetchPromise,
      ttlSeconds: CACHE_CONFIG.SALES_TTL / 1000,
      isStale: salesCache.data && salesCache.lastFetchTime > 0 &&
        (Date.now() - salesCache.lastFetchTime) >= CACHE_CONFIG.SALES_TTL
    };
  }
};

// ============================================
// USERS CACHE API (ENHANCED)
// ============================================

export const UsersCache = {
  async getOrFetch(fetchFn) {
    const ttl = CACHE_CONFIG.USERS_TTL;
    const cacheAge = usersCache.lastFetchTime ? Math.round((Date.now() - usersCache.lastFetchTime) / 1000) : null;

    usersCache.fetchFunction = fetchFn;

    // 1. Cache HIT
    if (usersCache.data && (Date.now() - usersCache.lastFetchTime) < ttl) {
      logCacheStatus('Users', 'CACHE HIT', {
        'Users in cache': usersCache.data.length,
        'Cache age': `${cacheAge} seconds`,
        'Google API call': 'NO'
      });
      return { data: usersCache.data, fromCache: true };
    }

    // 2. Stale-While-Revalidate
    if (usersCache.data && !usersCache.fetchPromise) {
      logCacheStatus('Users', 'STALE - Background refresh', {
        'Users in cache': usersCache.data.length
      });
      this._refreshInBackground(fetchFn);
      return { data: usersCache.data, fromCache: true, stale: true };
    }

    // 3. Share existing promise
    if (usersCache.fetchPromise) {
      logCacheStatus('Users', 'WAITING - Sharing promise', {});
      try {
        const data = await usersCache.fetchPromise;
        return { data, fromCache: true, waited: true };
      } catch (error) {
        if (usersCache.data) {
          return { data: usersCache.data, fromCache: true, error: true };
        }
        throw error;
      }
    }

    // 4. Fresh fetch
    logCacheStatus('Users', 'CACHE MISS - Fetching from Google', {
      'Google API call': 'YES'
    });

    usersCache.fetchPromise = fetchFn();

    try {
      const startTime = Date.now();
      const freshData = await usersCache.fetchPromise;
      const duration = Date.now() - startTime;

      usersCache.data = freshData;
      usersCache.lastFetchTime = Date.now();

      logCacheStatus('Users', 'FETCH COMPLETE', {
        'Users fetched': freshData.length,
        'Time': `${duration}ms`,
        'Valid for': `${ttl / 1000} seconds`
      });

      return { data: freshData, fromCache: false };

    } catch (error) {
      console.log('ERROR: Users fetch failed -', error.message);
      if (usersCache.data) {
        return { data: usersCache.data, fromCache: true, error: true };
      }
      throw error;
    } finally {
      usersCache.fetchPromise = null;
    }
  },

  async _refreshInBackground(fetchFn) {
    if (usersCache.fetchPromise) return;

    usersCache.fetchPromise = fetchFn();

    try {
      const freshData = await usersCache.fetchPromise;
      usersCache.data = freshData;
      usersCache.lastFetchTime = Date.now();
      logCacheStatus('Users', 'BACKGROUND REFRESH COMPLETE', {
        'Users': freshData.length
      });
    } catch (error) {
      console.log('[Cache] Users background refresh failed:', error.message);
    } finally {
      usersCache.fetchPromise = null;
    }
  },

  softInvalidate() {
    logCacheStatus('Users', 'SOFT INVALIDATE', {
      'Users kept': usersCache.data?.length || 0
    });
    usersCache.lastFetchTime = 0;
    if (usersCache.fetchFunction && !usersCache.fetchPromise) {
      this._refreshInBackground(usersCache.fetchFunction);
    }
  },

  invalidate() {
    logCacheStatus('Users', 'HARD INVALIDATE', {
      'Cleared': usersCache.data?.length || 0
    });
    usersCache.data = null;
    usersCache.lastFetchTime = 0;
    usersCache.fetchPromise = null;
  },

  async preWarm(fetchFn) {
    if (usersCache.data) {
      console.log('[Cache Warmer] Users cache already warm');
      return;
    }

    console.log('[Cache Warmer] Pre-warming Users cache...');
    try {
      await this.getOrFetch(fetchFn);
      console.log('[Cache Warmer] Users cache warmed successfully');
    } catch (error) {
      console.error('[Cache Warmer] Failed to warm Users cache:', error.message);
    }
  },

  getStats() {
    return {
      hasData: !!usersCache.data,
      rowCount: usersCache.data?.length || 0,
      ageSeconds: usersCache.lastFetchTime ? Math.round((Date.now() - usersCache.lastFetchTime) / 1000) : null,
      isFetching: !!usersCache.fetchPromise,
      ttlSeconds: CACHE_CONFIG.USERS_TTL / 1000
    };
  }
};
