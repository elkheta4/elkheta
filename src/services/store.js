import { callGasApi } from './api';
import Console from '../utils/console';

/**
 * HYBRID DATA STORE
 * Supports: Memory (default), Session, and Local Storage.
 * Features: TTL (Time-To-Live), Deduping, Force Refresh, Smart Caching.
 * 
 * QUOTA OPTIMIZATION:
 * - Caches are preserved on logout to reduce API calls
 * - Login checks existing cache before fetching
 * - Only session-specific data is cleared on logout
 */

class DataStore {
  constructor() {
    this.memoryCache = {}; // For 'memory' mode
    this.promises = {};    // In-flight promises (Deduping)
  }

  /**
   * Main fetch method.
   * @param {string} key - Unique key.
   * @param {string} apiAction - API action name.
   * @param {object} params - Payload.
   * @param {object} options - { 
   *   storage: 'memory' | 'session' | 'local', 
   *   ttl: number (ms),
   *   force: boolean 
   * }
   */
  async fetch(key, apiAction, params = {}, options = {}) {
    const mode = options.storage || 'session';
    const ttl = options.ttl || 0;
    const force = options.force || false;

    // 1. Force Refresh?
    if (force) {
      this.invalidate(key, mode);
    }

    // 2. Try Cache (if not forced)
    if (!force) {
      const cached = this._get(key, mode, ttl);
      if (cached && cached.data) {
        Console.store.cache(key, mode);
        return { ...cached.data, timestamp: cached.ts || Date.now() };
      }
    }

    // 3. Deduping
    if (this.promises[key]) {
      return this.promises[key];
    }

    // 4. Network
    Console.store.fetch(key);
    this.promises[key] = callGasApi(apiAction, params)
      .then(response => {
        if (response.success) {
          const now = Date.now();
          this._set(key, response, mode);
          return { ...response, timestamp: now };
        } else {
          throw new Error(response.error || 'Unknown Error');
        }
      })
      .finally(() => {
        delete this.promises[key];
      });

    return this.promises[key];
  }

  // --- Public Helpers ---

  get(key, mode = 'session') {
    const res = this._get(key, mode, 9999999999999);
    return res ? res.data : null;
  }

  /**
   * Check if cache exists and is valid
   * Useful for deciding whether to fetch on login
   */
  hasValidCache(key, mode = 'local') {
    const cached = this._get(key, mode, 9999999999999);
    return cached && cached.data && cached.data.success;
  }

  /**
   * Optimistic Update (List)
   */
  addToList(key, listProp, item, mode = 'session', unshift = true) {
    const cached = this._get(key, mode, 9999999999999);
    const data = cached ? cached.data : null;

    if (data && data[listProp] && Array.isArray(data[listProp])) {
      if (unshift) {
        data[listProp].unshift(item);
      } else {
        data[listProp].push(item);
      }
      this._set(key, data, mode);
      return true;
    }
    return false;
  }

  removeFromList(key, listProp, idField, idValue, mode = 'session') {
    const cached = this._get(key, mode, 9999999999999);
    const data = cached ? cached.data : null;

    if (data && data[listProp] && Array.isArray(data[listProp])) {
      data[listProp] = data[listProp].filter(i => i[idField] != idValue);
      this._set(key, data, mode);
      return true;
    }
    return false;
  }

  invalidate(key, mode = 'session') {
    if (typeof window === 'undefined') return;
    if (mode === 'memory') {
      delete this.memoryCache[key];
    } else if (mode === 'session') {
      try {
        sessionStorage.removeItem(`store_${key}`);
        sessionStorage.removeItem(`store_${key}_ts`);
      } catch (e) {}
    } else if (mode === 'local') {
      try {
        localStorage.removeItem(`store_${key}`);
        localStorage.removeItem(`store_${key}_ts`);
      } catch (e) {}
    }
  }

  /**
   * Clear session-only caches (called on logout)
   * Preserves localStorage for quota optimization
   */
  clearSession() {
    if (typeof window === 'undefined') return;
    
    // 1. Clear memory cache
    this.memoryCache = {};
    this.promises = {};
    
    // 2. Clear sessionStorage store_ keys only
    try {
      const sessionKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('store_')) {
          sessionKeys.push(key);
        }
      }
      sessionKeys.forEach(key => sessionStorage.removeItem(key));
    } catch (e) {}
    
    Console.store.clear('Session');
  }

  /**
   * Clear ALL caches including localStorage
   * Use only when necessary (e.g., data corruption, manual refresh)
   */
  clearAll() {
    if (typeof window === 'undefined') return;
    
    this.memoryCache = {};
    this.promises = {};
    
    // Clear localStorage store_ keys
    try {
      const localKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('store_')) {
          localKeys.push(key);
        }
      }
      localKeys.forEach(key => localStorage.removeItem(key));
    } catch (e) {}
    
    // Clear sessionStorage store_ keys
    try {
      const sessionKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('store_')) {
          sessionKeys.push(key);
        }
      }
      sessionKeys.forEach(key => sessionStorage.removeItem(key));
    } catch (e) {}
    
    Console.store.clear('All');
  }

  // --- Internal Storage Logic ---

  _get(key, mode, ttl) {
    let data = null;
    let ts = null;
    const now = Date.now();

    if (mode === 'memory') {
      if (this.memoryCache[key]) {
        return { data: this.memoryCache[key], ts: now };
      }
    } else if (typeof window !== 'undefined') {
        if (mode === 'session') {
          try {
            const raw = sessionStorage.getItem(`store_${key}`);
            ts = sessionStorage.getItem(`store_${key}_ts`);
            if (raw) data = JSON.parse(raw);
          } catch(e) {}
        } else if (mode === 'local') {
          try {
            const raw = localStorage.getItem(`store_${key}`);
            ts = localStorage.getItem(`store_${key}_ts`);
            if (raw) data = JSON.parse(raw);
          } catch(e) {}
        }
    }

    if (!data) return null;

    // Check TTL
    if (ttl > 0 && ts) {
      const age = now - parseInt(ts);
      if (age > ttl) {
        Console.store.expired(key, mode, age, ttl);
        return null; 
      }
    }

    return { data, ts: ts ? parseInt(ts) : null };
  }

  _set(key, data, mode) {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    if (mode === 'memory') {
      this.memoryCache[key] = data;
    } else if (mode === 'session') {
      try {
        sessionStorage.setItem(`store_${key}`, JSON.stringify(data));
        sessionStorage.setItem(`store_${key}_ts`, now);
      } catch(e) { console.warn('SessionStorage Limit', e); }
    } else if (mode === 'local') {
      try {
        localStorage.setItem(`store_${key}`, JSON.stringify(data));
        localStorage.setItem(`store_${key}_ts`, now);
      } catch(e) { console.warn('LocalStorage Limit', e); }
    }
  }
}

const Store = new DataStore();
export default Store;
